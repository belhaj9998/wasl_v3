import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { slugify } from "../../utils/slugify";
import { mapProductVariantToDto } from "../../mappers";

/**
 * Input for creating a product variant.
 */
interface CreateVariantInput {
  title: string;
  sku: string;
  barcode?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  cost_price?: number | null;
  weight_grams?: number | null;
  is_active?: boolean;
  option_value_ids?: number[];
}

/**
 * Input for updating a product variant.
 */
interface UpdateVariantInput {
  title?: string;
  sku?: string;
  barcode?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  cost_price?: number | null;
  weight_grams?: number | null;
  is_active?: boolean;
}

/**
 * Result of variant generation.
 */
interface GenerateResult {
  created: number;
  skipped: number;
  total: number;
}

/**
 * ProductVariantService handles product variant management:
 * listing, creating, updating, deleting, setting default,
 * and bulk generation via cartesian product of option values.
 */
export class ProductVariantService {
  /**
   * Lists all variants for a product with option_values and inventory.
   * Validates that the product exists in the store.
   */
  async list(storeId: number, productId: number) {
    // Validate product exists in store
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
      select: { id: true },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    const variants = await prisma.productVariant.findMany({
      where: { product_id: productId, store_id: storeId },
      orderBy: { sort_order: "asc" },
      include: {
        option_values: { include: { option_value: true } },
        inventory: true,
      },
    });

    return variants.map(mapProductVariantToDto);
  }

  /**
   * Creates a single variant with option value links and inventory record.
   * Validates SKU uniqueness (409), barcode uniqueness (409),
   * creates VariantOptionValue links, and sets product.has_variants=true.
   */
  async create(storeId: number, productId: number, data: CreateVariantInput) {
    const {
      title,
      sku,
      barcode,
      price,
      compare_at_price,
      cost_price,
      weight_grams,
      is_active = true,
      option_value_ids,
    } = data;

    // Validate product exists in store
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
      select: { id: true },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    // Validate SKU uniqueness within the store
    const existingSku = await prisma.productVariant.findFirst({
      where: { store_id: storeId, sku },
    });

    if (existingSku) {
      throw AppError.conflict("SKU already exists in this store");
    }

    // Validate barcode uniqueness within the store (if provided)
    if (barcode) {
      const existingBarcode = await prisma.productVariant.findFirst({
        where: { store_id: storeId, barcode },
      });

      if (existingBarcode) {
        throw AppError.conflict("Barcode already exists in this store");
      }
    }

    // Determine sort_order
    const maxSortOrder = await prisma.productVariant.aggregate({
      where: { product_id: productId, store_id: storeId },
      _max: { sort_order: true },
    });
    const sortOrder = (maxSortOrder._max.sort_order ?? -1) + 1;

    // Create variant in transaction
    const variant = await prisma.$transaction(async (tx) => {
      // Create the variant
      const newVariant = await tx.productVariant.create({
        data: {
          store_id: storeId,
          product_id: productId,
          title,
          sku,
          barcode: barcode ?? null,
          price: price ?? null,
          compare_at_price: compare_at_price ?? null,
          cost_price: cost_price ?? null,
          weight_grams: weight_grams ?? null,
          is_default: false,
          is_active,
          sort_order: sortOrder,
        },
      });

      // Create VariantOptionValue links
      if (option_value_ids && option_value_ids.length > 0) {
        await tx.variantOptionValue.createMany({
          data: option_value_ids.map((optionValueId) => ({
            store_id: storeId,
            variant_id: newVariant.id,
            option_value_id: optionValueId,
          })),
        });
      }

      // Create inventory record
      await tx.inventory.create({
        data: {
          store_id: storeId,
          variant_id: newVariant.id,
          total_quantity: 0,
          available_quantity: 0,
          reserved_quantity: 0,
          low_stock_threshold: 5,
        },
      });

      // Set product.has_variants = true
      await tx.product.update({
        where: { id_store_id: { id: productId, store_id: storeId } },
        data: { has_variants: true },
      });

      // Return variant with relations
      return tx.productVariant.findFirst({
        where: { id: newVariant.id, store_id: storeId },
        include: {
          option_values: { include: { option_value: true } },
          inventory: true,
        },
      });
    });

    if (!variant) {
      throw AppError.notFound("Variant not found after create");
    }

    return mapProductVariantToDto(variant);
  }

  /**
   * Gets a variant by ID with option_values and inventory.
   * Validates that the variant exists in the store.
   */
  async getById(storeId: number, variantId: number) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, store_id: storeId },
      include: {
        option_values: { include: { option_value: true } },
        inventory: true,
      },
    });

    if (!variant) {
      throw AppError.notFound("Variant not found");
    }

    return mapProductVariantToDto(variant);
  }

  /**
   * Updates variant fields (price, SKU, barcode, weight, etc.).
   * Validates SKU/barcode uniqueness if changed (409).
   */
  async update(storeId: number, variantId: number, data: UpdateVariantInput) {
    // Check existence
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, store_id: storeId },
    });

    if (!variant) {
      throw AppError.notFound("Variant not found");
    }

    const updateData: any = {};

    // Validate SKU uniqueness if changed
    if (data.sku !== undefined && data.sku !== variant.sku) {
      const existingSku = await prisma.productVariant.findFirst({
        where: {
          store_id: storeId,
          sku: data.sku,
          NOT: { id: variantId },
        },
      });

      if (existingSku) {
        throw AppError.conflict("SKU already exists in this store");
      }

      updateData.sku = data.sku;
    }

    // Validate barcode uniqueness if changed
    if (data.barcode !== undefined && data.barcode !== variant.barcode) {
      if (data.barcode) {
        const existingBarcode = await prisma.productVariant.findFirst({
          where: {
            store_id: storeId,
            barcode: data.barcode,
            NOT: { id: variantId },
          },
        });

        if (existingBarcode) {
          throw AppError.conflict("Barcode already exists in this store");
        }
      }

      updateData.barcode = data.barcode ?? null;
    }

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.price !== undefined) {
      updateData.price = data.price;
    }

    if (data.compare_at_price !== undefined) {
      updateData.compare_at_price = data.compare_at_price;
    }

    if (data.cost_price !== undefined) {
      updateData.cost_price = data.cost_price;
    }

    if (data.weight_grams !== undefined) {
      updateData.weight_grams = data.weight_grams;
    }

    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    const updated = await prisma.productVariant.update({
      where: { id_store_id: { id: variantId, store_id: storeId } },
      data: updateData,
      include: {
        option_values: { include: { option_value: true } },
        inventory: true,
      },
    });

    return mapProductVariantToDto(updated);
  }

  /**
   * Deletes a variant.
   * Prevents deleting the last variant (400).
   * Reassigns is_default if deleting the default variant.
   */
  async delete(storeId: number, variantId: number) {
    // Check existence
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, store_id: storeId },
    });

    if (!variant) {
      throw AppError.notFound("Variant not found");
    }

    // Count variants for this product
    const variantCount = await prisma.productVariant.count({
      where: { product_id: variant.product_id, store_id: storeId },
    });

    // Prevent deleting the last variant
    if (variantCount <= 1) {
      throw AppError.badRequest("Cannot delete the last variant of a product");
    }

    await prisma.$transaction(async (tx) => {
      // If deleting the default variant, reassign is_default to another variant
      if (variant.is_default) {
        const nextDefault = await tx.productVariant.findFirst({
          where: {
            product_id: variant.product_id,
            store_id: storeId,
            NOT: { id: variantId },
          },
          orderBy: { sort_order: "asc" },
        });

        if (nextDefault) {
          await tx.productVariant.update({
            where: { id_store_id: { id: nextDefault.id, store_id: storeId } },
            data: { is_default: true },
          });
        }
      }

      // Delete the variant (cascade handles inventory, option_values)
      await tx.productVariant.delete({
        where: { id_store_id: { id: variantId, store_id: storeId } },
      });
    });
  }

  /**
   * Sets a variant as the default for its product.
   * Unsets current default, sets new default in transaction.
   */
  async setDefault(storeId: number, variantId: number) {
    // Check existence
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, store_id: storeId },
    });

    if (!variant) {
      throw AppError.notFound("Variant not found");
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Unset current default for this product
      await tx.productVariant.updateMany({
        where: {
          product_id: variant.product_id,
          store_id: storeId,
          is_default: true,
        },
        data: { is_default: false },
      });

      // Set new default
      return tx.productVariant.update({
        where: { id_store_id: { id: variantId, store_id: storeId } },
        data: { is_default: true },
        include: {
          option_values: { include: { option_value: true } },
          inventory: true,
        },
      });
    });

    return mapProductVariantToDto(updated);
  }

  /**
   * Generates all variant combinations from product options (cartesian product).
   * Skips existing combinations, generates title/SKU, creates variants + inventory
   * in a transaction, and sets has_variants=true.
   */
  async generateVariants(
    storeId: number,
    productId: number,
  ): Promise<GenerateResult> {
    // Fetch product with options and values, and existing variants
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
      include: {
        options: {
          orderBy: { position: "asc" },
          include: { values: { orderBy: { position: "asc" } } },
        },
        variants: {
          include: { option_values: true },
        },
      },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    if (product.options.length === 0) {
      throw AppError.badRequest(
        "Product has no options defined. Add options and values first.",
      );
    }

    // Validate all options have at least one value
    for (const option of product.options) {
      if (option.values.length === 0) {
        throw AppError.badRequest("All options must have at least one value");
      }
    }

    // Compute cartesian product of option values
    const optionValueArrays = product.options.map((opt) => opt.values);
    const combinations = cartesianProduct(optionValueArrays);

    // Identify existing combinations by option_value_id sets
    const existingCombinations = new Set(
      product.variants.map((v) =>
        v.option_values
          .map((ov) => ov.option_value_id)
          .sort((a, b) => a - b)
          .join(","),
      ),
    );

    let created = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const combination of combinations) {
        const key = combination
          .map((v) => v.id)
          .sort((a, b) => a - b)
          .join(",");

        if (existingCombinations.has(key)) {
          skipped++;
          continue;
        }

        // Generate title: "Red / Large / Cotton"
        const title = combination.map((v) => v.value).join(" / ");

        // Generate SKU: product-slug-red-large-cotton
        const skuBase = `${product.slug}-${combination.map((v) => slugify(v.value)).join("-")}`;
        const sku = await ensureUniqueSku(tx, storeId, skuBase);

        // Create variant
        const newVariant = await tx.productVariant.create({
          data: {
            store_id: storeId,
            product_id: productId,
            title,
            sku,
            price: null,
            is_default: created === 0 && product.variants.length === 0,
            is_active: true,
            sort_order: product.variants.length + created,
          },
        });

        // Create option value links
        await tx.variantOptionValue.createMany({
          data: combination.map((v) => ({
            store_id: storeId,
            variant_id: newVariant.id,
            option_value_id: v.id,
          })),
        });

        // Create inventory record
        await tx.inventory.create({
          data: {
            store_id: storeId,
            variant_id: newVariant.id,
            total_quantity: 0,
            available_quantity: 0,
            reserved_quantity: 0,
            low_stock_threshold: 5,
          },
        });

        created++;
      }

      // Update product.has_variants = true
      if (created > 0) {
        await tx.product.update({
          where: { id_store_id: { id: productId, store_id: storeId } },
          data: { has_variants: true },
        });
      }
    });

    return { created, skipped, total: combinations.length };
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Computes the cartesian product of arrays.
 * Input: [[Red, Blue], [S, M, L]]
 * Output: [[Red,S], [Red,M], [Red,L], [Blue,S], [Blue,M], [Blue,L]]
 */
export function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];

  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap((combo) => curr.map((item) => [...combo, item])),
    [[]],
  );
}

/**
 * Ensures SKU uniqueness within a store by appending numeric suffix if needed.
 */
export async function ensureUniqueSku(
  tx: any,
  storeId: number,
  baseSku: string,
): Promise<string> {
  let sku = baseSku;
  let suffix = 1;

  while (
    await tx.productVariant.findFirst({ where: { store_id: storeId, sku } })
  ) {
    sku = `${baseSku}-${suffix}`;
    suffix++;
  }

  return sku;
}

export const productVariantService = new ProductVariantService();
