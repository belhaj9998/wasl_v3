import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { slugify } from "../../utils/slugify";

/**
 * Parameters for listing products with pagination, filtering, and sorting.
 */
interface ProductListParams {
  page?: number;
  limit?: number;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  category_id?: number;
  min_price?: number;
  max_price?: number;
  search?: string;
  is_published?: boolean;
  sort_by?: "name" | "price" | "created_at" | "updated_at";
  sort_order?: "asc" | "desc";
}

/**
 * Input for creating a product.
 */
interface CreateProductInput {
  name: string;
  description?: string | null;
  short_description?: string | null;
  base_price: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  track_inventory?: boolean;
  has_variants?: boolean;
  category_ids?: number[];
}

/**
 * Input for updating a product.
 */
interface UpdateProductInput {
  name?: string;
  description?: string | null;
  short_description?: string | null;
  base_price?: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  track_inventory?: boolean;
  category_ids?: number[];
}

/**
 * ProductService handles product management within a store:
 * listing with filters/search, creating, updating, deleting,
 * status transitions, publishing, and duplication.
 */
export class ProductService {
  /**
   * Lists products with pagination, filtering, sorting, and search.
   * Includes first media image and one active variant per product.
   */
  async list(storeId: number, params: ProductListParams) {
    const {
      page = 1,
      limit = 20,
      status,
      category_id,
      min_price,
      max_price,
      search,
      is_published,
      sort_by = "created_at",
      sort_order = "desc",
    } = params;

    // Build where clause
    const where: any = { store_id: storeId };

    if (status) {
      where.status = status;
    }

    if (is_published !== undefined) {
      where.is_published = is_published;
    }

    if (category_id) {
      where.categories = {
        some: { category_id },
      };
    }

    if (min_price !== undefined || max_price !== undefined) {
      where.base_price = {};
      if (min_price !== undefined) {
        where.base_price.gte = min_price;
      }
      if (max_price !== undefined) {
        where.base_price.lte = max_price;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { short_description: { contains: search, mode: "insensitive" } },
        {
          variants: {
            some: { sku: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    if (sort_by === "price") {
      orderBy.base_price = sort_order;
    } else if (sort_by === "name") {
      orderBy.name = sort_order;
    } else if (sort_by === "updated_at") {
      orderBy.updated_at = sort_order;
    } else {
      orderBy.created_at = sort_order;
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          media: { orderBy: { sort_order: "asc" }, take: 1 },
          variants: {
            where: { is_active: true },
            take: 1,
            orderBy: { sort_order: "asc" },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Creates a product with optional category assignments.
   * Validates compare_at_price > base_price, validates category_ids exist,
   * generates unique slug, creates ProductCategory links,
   * and auto-creates a default variant + inventory if has_variants=false.
   */
  async create(storeId: number, data: CreateProductInput) {
    const {
      name,
      description,
      short_description,
      base_price,
      compare_at_price,
      cost_price,
      track_inventory = true,
      has_variants = false,
      category_ids,
    } = data;

    // Validate compare_at_price > base_price
    if (
      compare_at_price !== undefined &&
      compare_at_price !== null &&
      compare_at_price <= base_price
    ) {
      throw AppError.unprocessable(
        "compare_at_price must be greater than base_price",
      );
    }

    // Validate category_ids exist in the store
    if (category_ids && category_ids.length > 0) {
      const existingCategories = await prisma.category.findMany({
        where: { id: { in: category_ids }, store_id: storeId },
        select: { id: true },
      });

      if (existingCategories.length !== category_ids.length) {
        throw AppError.badRequest("One or more category IDs are invalid");
      }
    }

    // Generate unique slug
    const baseSlug = slugify(name);
    const slug = await this.ensureUniqueSlug(null, storeId, baseSlug);

    // Create product in transaction
    const product = await prisma.$transaction(async (tx) => {
      // Create the product
      const newProduct = await tx.product.create({
        data: {
          store_id: storeId,
          name,
          slug,
          description: description ?? null,
          short_description: short_description ?? null,
          base_price,
          compare_at_price: compare_at_price ?? null,
          cost_price: cost_price ?? null,
          track_inventory,
          has_variants,
          status: "DRAFT",
          is_published: false,
        },
      });

      // Create ProductCategory links
      if (category_ids && category_ids.length > 0) {
        await tx.productCategory.createMany({
          data: category_ids.map((categoryId) => ({
            store_id: storeId,
            product_id: newProduct.id,
            category_id: categoryId,
          })),
        });
      }

      // Auto-create default variant + inventory if has_variants=false
      if (!has_variants) {
        const variantSku = await this.ensureUniqueSku(tx, storeId, slug);

        const variant = await tx.productVariant.create({
          data: {
            store_id: storeId,
            product_id: newProduct.id,
            title: "Default",
            sku: variantSku,
            price: null,
            is_default: true,
            is_active: true,
            sort_order: 0,
          },
        });

        await tx.inventory.create({
          data: {
            store_id: storeId,
            variant_id: variant.id,
            total_quantity: 0,
            available_quantity: 0,
            reserved_quantity: 0,
            low_stock_threshold: 5,
          },
        });
      }

      // Return product with relations
      return tx.product.findFirst({
        where: { id: newProduct.id, store_id: storeId },
        include: {
          categories: { include: { category: true } },
          media: { orderBy: { sort_order: "asc" } },
          variants: {
            include: {
              option_values: { include: { option_value: true } },
              inventory: true,
            },
          },
        },
      });
    });

    return product;
  }

  /**
   * Gets a product by ID with all relations:
   * categories, options+values, variants+option_values, media sorted by sort_order, inventory.
   */
  async getById(storeId: number, productId: number) {
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
      include: {
        categories: { include: { category: true } },
        options: {
          orderBy: { position: "asc" },
          include: {
            values: { orderBy: { position: "asc" } },
          },
        },
        variants: {
          orderBy: { sort_order: "asc" },
          include: {
            option_values: { include: { option_value: true } },
            inventory: true,
          },
        },
        media: { orderBy: { sort_order: "asc" } },
      },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    return product;
  }

  /**
   * Updates product fields. Regenerates slug if name changes.
   * Replaces category links if category_ids provided.
   */
  async update(storeId: number, productId: number, data: UpdateProductInput) {
    // Check existence
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    const updateData: any = {};

    // Handle name change — regenerate slug
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = await this.ensureUniqueSlug(
        null,
        storeId,
        slugify(data.name),
        productId,
      );
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.short_description !== undefined) {
      updateData.short_description = data.short_description;
    }

    if (data.base_price !== undefined) {
      updateData.base_price = data.base_price;
    }

    if (data.compare_at_price !== undefined) {
      updateData.compare_at_price = data.compare_at_price;
    }

    if (data.cost_price !== undefined) {
      updateData.cost_price = data.cost_price;
    }

    if (data.track_inventory !== undefined) {
      updateData.track_inventory = data.track_inventory;
    }

    // Validate compare_at_price > base_price if both are relevant
    const effectiveBasePrice = data.base_price ?? product.base_price;
    const effectiveComparePrice =
      data.compare_at_price !== undefined
        ? data.compare_at_price
        : product.compare_at_price;

    if (
      effectiveComparePrice !== null &&
      effectiveComparePrice !== undefined &&
      Number(effectiveComparePrice) <= Number(effectiveBasePrice)
    ) {
      throw AppError.unprocessable(
        "compare_at_price must be greater than base_price",
      );
    }

    // Validate and replace category_ids if provided
    if (data.category_ids !== undefined) {
      if (data.category_ids.length > 0) {
        const existingCategories = await prisma.category.findMany({
          where: { id: { in: data.category_ids }, store_id: storeId },
          select: { id: true },
        });

        if (existingCategories.length !== data.category_ids.length) {
          throw AppError.badRequest("One or more category IDs are invalid");
        }
      }
    }

    // Execute update in transaction (to handle category replacement atomically)
    const updated = await prisma.$transaction(async (tx) => {
      // Update product fields
      await tx.product.update({
        where: { id_store_id: { id: productId, store_id: storeId } },
        data: updateData,
      });

      // Replace category links if category_ids provided
      if (data.category_ids !== undefined) {
        // Delete existing links
        await tx.productCategory.deleteMany({
          where: { store_id: storeId, product_id: productId },
        });

        // Create new links
        if (data.category_ids.length > 0) {
          await tx.productCategory.createMany({
            data: data.category_ids.map((categoryId) => ({
              store_id: storeId,
              product_id: productId,
              category_id: categoryId,
            })),
          });
        }
      }

      // Return updated product with relations
      return tx.product.findFirst({
        where: { id: productId, store_id: storeId },
        include: {
          categories: { include: { category: true } },
          media: { orderBy: { sort_order: "asc" } },
          variants: {
            include: {
              option_values: { include: { option_value: true } },
              inventory: true,
            },
          },
        },
      });
    });

    return updated;
  }

  /**
   * Deletes a product. Cascade handles variants, options, media, inventory, category links.
   */
  async delete(storeId: number, productId: number) {
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    await prisma.product.delete({
      where: { id_store_id: { id: productId, store_id: storeId } },
    });
  }

  /**
   * Updates product status with transition validation.
   * Valid transitions: DRAFT→ACTIVE, ACTIVE→ARCHIVED, ARCHIVED→DRAFT.
   */
  async updateStatus(
    storeId: number,
    productId: number,
    status: "DRAFT" | "ACTIVE" | "ARCHIVED",
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["ACTIVE"],
      ACTIVE: ["ARCHIVED"],
      ARCHIVED: ["DRAFT"],
    };

    const allowedNextStatuses = validTransitions[product.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      throw AppError.badRequest(
        `Invalid status transition from ${product.status} to ${status}`,
      );
    }

    const updated = await prisma.product.update({
      where: { id_store_id: { id: productId, store_id: storeId } },
      data: { status },
    });

    return updated;
  }

  /**
   * Publishes or unpublishes a product.
   * Sets is_published and published_at timestamp (only on publish).
   */
  async publish(storeId: number, productId: number, publish: boolean) {
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    const updateData: any = { is_published: publish };

    if (publish) {
      updateData.published_at = new Date();
    }

    const updated = await prisma.product.update({
      where: { id_store_id: { id: productId, store_id: storeId } },
      data: updateData,
    });

    return updated;
  }

  /**
   * Duplicates a product with all relations in a single transaction.
   * Clones: product, categories, media, options+values, variants+option_values.
   * Creates fresh inventory records (all zeros) and new SKUs with -copy suffix.
   */
  async duplicate(storeId: number, productId: number) {
    // Fetch the source product with all relations
    const source = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
      include: {
        categories: true,
        media: { orderBy: { sort_order: "asc" } },
        options: {
          orderBy: { position: "asc" },
          include: {
            values: { orderBy: { position: "asc" } },
          },
        },
        variants: {
          orderBy: { sort_order: "asc" },
          include: {
            option_values: true,
          },
        },
      },
    });

    if (!source) {
      throw AppError.notFound("Product not found");
    }

    const duplicated = await prisma.$transaction(async (tx) => {
      // Generate new name and slug
      const newName = `${source.name} (Copy)`;
      const newSlug = await this.ensureUniqueSlug(
        tx,
        storeId,
        slugify(newName),
      );

      // Create the new product
      const newProduct = await tx.product.create({
        data: {
          store_id: storeId,
          name: newName,
          slug: newSlug,
          description: source.description,
          short_description: source.short_description,
          base_price: source.base_price,
          compare_at_price: source.compare_at_price,
          cost_price: source.cost_price,
          track_inventory: source.track_inventory,
          has_variants: source.has_variants,
          status: "DRAFT",
          is_published: false,
          published_at: null,
        },
      });

      // Clone ProductCategory links
      if (source.categories.length > 0) {
        await tx.productCategory.createMany({
          data: source.categories.map((cat) => ({
            store_id: storeId,
            product_id: newProduct.id,
            category_id: cat.category_id,
          })),
        });
      }

      // Clone ProductMedia
      if (source.media.length > 0) {
        await tx.productMedia.createMany({
          data: source.media.map((m) => ({
            store_id: storeId,
            product_id: newProduct.id,
            url: m.url,
            alt_text: m.alt_text,
            sort_order: m.sort_order,
          })),
        });
      }

      // Clone ProductOptions and ProductOptionValues
      // We need to track old option value IDs to new IDs for variant cloning
      const optionValueIdMap = new Map<number, number>(); // oldValueId -> newValueId

      for (const option of source.options) {
        const newOption = await tx.productOption.create({
          data: {
            store_id: storeId,
            product_id: newProduct.id,
            name: option.name,
            position: option.position,
          },
        });

        for (const value of option.values) {
          const newValue = await tx.productOptionValue.create({
            data: {
              store_id: storeId,
              option_id: newOption.id,
              value: value.value,
              position: value.position,
            },
          });

          optionValueIdMap.set(value.id, newValue.id);
        }
      }

      // Clone ProductVariants with new SKUs and fresh inventory
      for (const variant of source.variants) {
        const baseSku = `${variant.sku}-copy`;
        const newSku = await this.ensureUniqueSku(tx, storeId, baseSku);

        const newVariant = await tx.productVariant.create({
          data: {
            store_id: storeId,
            product_id: newProduct.id,
            title: variant.title,
            sku: newSku,
            barcode: null, // Don't copy barcode to avoid uniqueness conflicts
            price: variant.price,
            compare_at_price: variant.compare_at_price,
            cost_price: variant.cost_price,
            weight_grams: variant.weight_grams,
            sort_order: variant.sort_order,
            is_default: variant.is_default,
            is_active: variant.is_active,
          },
        });

        // Clone VariantOptionValue links
        for (const vov of variant.option_values) {
          const newOptionValueId = optionValueIdMap.get(vov.option_value_id);
          if (newOptionValueId) {
            await tx.variantOptionValue.create({
              data: {
                store_id: storeId,
                variant_id: newVariant.id,
                option_value_id: newOptionValueId,
              },
            });
          }
        }

        // Create fresh inventory record (all zeros)
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
      }

      // Return the duplicated product with relations
      return tx.product.findFirst({
        where: { id: newProduct.id, store_id: storeId },
        include: {
          categories: { include: { category: true } },
          media: { orderBy: { sort_order: "asc" } },
          options: {
            orderBy: { position: "asc" },
            include: { values: { orderBy: { position: "asc" } } },
          },
          variants: {
            orderBy: { sort_order: "asc" },
            include: {
              option_values: { include: { option_value: true } },
              inventory: true,
            },
          },
        },
      });
    });

    return duplicated;
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  /**
   * Ensures slug uniqueness within a store by appending numeric suffix if needed.
   * Optionally excludes a product ID (for updates).
   * Accepts an optional transaction client.
   */
  private async ensureUniqueSlug(
    tx: any | null,
    storeId: number,
    baseSlug: string,
    excludeId?: number,
  ): Promise<string> {
    const client = tx || prisma;
    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await client.product.findFirst({
        where: {
          store_id: storeId,
          slug,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });

      if (!existing) return slug;

      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
  }

  /**
   * Ensures SKU uniqueness within a store by appending numeric suffix if needed.
   * Used for default variant creation and duplication.
   */
  private async ensureUniqueSku(
    tx: any,
    storeId: number,
    baseSku: string,
  ): Promise<string> {
    let sku = baseSku;
    let suffix = 1;

    while (true) {
      const existing = await tx.productVariant.findFirst({
        where: { store_id: storeId, sku },
      });

      if (!existing) return sku;

      sku = `${baseSku}-${suffix}`;
      suffix++;
    }
  }
}

export const productService = new ProductService();
