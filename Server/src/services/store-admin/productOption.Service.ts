import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { mapProductOptionToDto } from "../../mappers";

type ProductOptionType = "TEXT" | "COLOR" | "IMAGE";

function normalizeValueMetadata(
  optionType: ProductOptionType,
  data: {
    color_hex?: string | null;
    image_url?: string | null;
  },
) {
  if (optionType === "COLOR") {
    return {
      color_hex: data.color_hex ?? null,
      image_url: null,
    };
  }

  if (optionType === "IMAGE") {
    return {
      color_hex: null,
      image_url: data.image_url ?? null,
    };
  }

  return {
    color_hex: null,
    image_url: null,
  };
}

function cleanupMetadataForOptionType(optionType: ProductOptionType) {
  if (optionType === "COLOR") {
    return { image_url: null };
  }

  if (optionType === "IMAGE") {
    return { color_hex: null };
  }

  return { color_hex: null, image_url: null };
}

/**
 * Input for creating a product option.
 */
interface CreateOptionInput {
  name: string;
  type?: ProductOptionType;
  position?: number;
}

/**
 * Input for updating a product option.
 */
interface UpdateOptionInput {
  name?: string;
  type?: ProductOptionType;
  position?: number;
}

/**
 * Input for creating an option value.
 */
interface CreateOptionValueInput {
  value: string;
  color_hex?: string | null;
  image_url?: string | null;
  position?: number;
}

/**
 * Input for updating an option value.
 */
interface UpdateOptionValueInput {
  value?: string;
  color_hex?: string | null;
  image_url?: string | null;
  position?: number;
}

/**
 * ProductOptionService handles product option and option value management:
 * listing options with values, creating/updating/deleting options,
 * and adding/updating/deleting option values.
 */
export class ProductOptionService {
  /**
   * Lists all options for a product ordered by position,
   * each including their associated values ordered by position.
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

    const options = await prisma.productOption.findMany({
      where: { product_id: productId, store_id: storeId },
      orderBy: { position: "asc" },
      include: {
        values: { orderBy: { position: "asc" } },
      },
    });

    return options.map(mapProductOptionToDto);
  }
  async getById(storeId: number, productId: number, optionId: number) {
    const option = await prisma.productOption.findFirst({
      where: { id: optionId, product_id: productId, store_id: storeId },
      include: {
        values: { orderBy: { position: "asc" } },
      },
    });

    if (!option) {
      throw AppError.notFound("Product option not found");
    }

    return mapProductOptionToDto(option);
  }

  /**
   * Creates a new product option.
   * Validates product exists in store, checks option name uniqueness per product (409),
   * and sets position to max+1 if not provided.
   */
  async create(storeId: number, productId: number, data: CreateOptionInput) {
    const { name, type = "TEXT", position } = data;

    // Validate product exists in store
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
      select: { id: true },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    // Check option name uniqueness per product
    const existingOption = await prisma.productOption.findFirst({
      where: { product_id: productId, store_id: storeId, name },
    });

    if (existingOption) {
      throw AppError.conflict(
        "Option with this name already exists for this product",
      );
    }

    // Determine position: use provided or max+1
    let finalPosition = position;
    if (finalPosition === undefined) {
      const maxPosition = await prisma.productOption.aggregate({
        where: { product_id: productId, store_id: storeId },
        _max: { position: true },
      });
      finalPosition = (maxPosition._max.position ?? -1) + 1;
    }

    // Create the option
    const option = await prisma.productOption.create({
      data: {
        store_id: storeId,
        product_id: productId,
        name,
        type,
        position: finalPosition,
      },
      include: {
        values: { orderBy: { position: "asc" } },
      },
    });

    return mapProductOptionToDto(option);
  }

  /**
   * Updates a product option.
   * Validates option exists for the product in the store,
   * checks name uniqueness if name changed (409).
   */
  async update(
    storeId: number,
    productId: number,
    optionId: number,
    data: UpdateOptionInput,
  ) {
    // Validate option exists for this product in this store
    const option = await prisma.productOption.findFirst({
      where: { id: optionId, product_id: productId, store_id: storeId },
    });

    if (!option) {
      throw AppError.notFound("Product option not found");
    }

    const updateData: any = {};

    // Check name uniqueness if name is being changed
    if (data.name !== undefined && data.name !== option.name) {
      const existingOption = await prisma.productOption.findFirst({
        where: {
          product_id: productId,
          store_id: storeId,
          name: data.name,
          NOT: { id: optionId },
        },
      });

      if (existingOption) {
        throw AppError.conflict(
          "Option with this name already exists for this product",
        );
      }

      updateData.name = data.name;
    }

    if (data.position !== undefined) {
      updateData.position = data.position;
    }

    if (data.type !== undefined && data.type !== option.type) {
      updateData.type = data.type;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.productOption.update({
        where: { id_store_id: { id: optionId, store_id: storeId } },
        data: updateData,
      });

      if (data.type !== undefined && data.type !== option.type) {
        await tx.productOptionValue.updateMany({
          where: { option_id: optionId, store_id: storeId },
          data: cleanupMetadataForOptionType(data.type),
        });
      }

      return tx.productOption.findUnique({
        where: { id_store_id: { id: optionId, store_id: storeId } },
        include: {
          values: { orderBy: { position: "asc" } },
        },
      });
    });

    if (!updated) {
      throw AppError.notFound("Product option not found");
    }

    return mapProductOptionToDto(updated);
  }

  /**
   * Deletes a product option and cascade-deletes its values.
   * Validates option exists for the product in the store.
   */
  async delete(storeId: number, productId: number, optionId: number) {
    // Validate option exists for this product in this store
    const option = await prisma.productOption.findFirst({
      where: { id: optionId, product_id: productId, store_id: storeId },
    });

    if (!option) {
      throw AppError.notFound("Product option not found");
    }

    // Delete option (cascade deletes values via Prisma schema onDelete: Cascade)
    await prisma.productOption.delete({
      where: { id_store_id: { id: optionId, store_id: storeId } },
    });
  }

  /**
   * Adds a value to a product option.
   * Validates option exists for the product in the store,
   * checks value uniqueness per option (409),
   * and sets position to max+1 if not provided.
   */
  async addValue(
    storeId: number,
    productId: number,
    optionId: number,
    data: CreateOptionValueInput,
  ) {
    const { value, position } = data;

    // Validate option exists for this product in this store
    const option = await prisma.productOption.findFirst({
      where: { id: optionId, product_id: productId, store_id: storeId },
    });

    if (!option) {
      throw AppError.notFound("Product option not found");
    }

    // Check value uniqueness per option
    const existingValue = await prisma.productOptionValue.findFirst({
      where: { option_id: optionId, store_id: storeId, value },
    });

    if (existingValue) {
      throw AppError.conflict("This value already exists for this option");
    }

    // Determine position: use provided or max+1
    let finalPosition = position;
    if (finalPosition === undefined) {
      const maxPosition = await prisma.productOptionValue.aggregate({
        where: { option_id: optionId, store_id: storeId },
        _max: { position: true },
      });
      finalPosition = (maxPosition._max.position ?? -1) + 1;
    }

    // Create the option value
    await prisma.productOptionValue.create({
      data: {
        store_id: storeId,
        option_id: optionId,
        value,
        ...normalizeValueMetadata(option.type as ProductOptionType, data),
        position: finalPosition,
      },
    });

    return this.getById(storeId, productId, optionId);
  }

  /**
   * Updates an option value.
   * Validates value exists for the option in the store,
   * checks uniqueness if value text changed (409).
   */
  async updateValue(
    storeId: number,
    productId: number,
    optionId: number,
    valueId: number,
    data: UpdateOptionValueInput,
  ) {
    // Validate option exists for this product in this store
    const option = await prisma.productOption.findFirst({
      where: { id: optionId, product_id: productId, store_id: storeId },
    });

    if (!option) {
      throw AppError.notFound("Product option not found");
    }

    // Validate value exists for this option
    const optionValue = await prisma.productOptionValue.findFirst({
      where: { id: valueId, option_id: optionId, store_id: storeId },
    });

    if (!optionValue) {
      throw AppError.notFound("Option value not found");
    }

    const updateData: any = {};

    // Check value uniqueness if value text is being changed
    if (data.value !== undefined && data.value !== optionValue.value) {
      const existingValue = await prisma.productOptionValue.findFirst({
        where: {
          option_id: optionId,
          store_id: storeId,
          value: data.value,
          NOT: { id: valueId },
        },
      });

      if (existingValue) {
        throw AppError.conflict("This value already exists for this option");
      }

      updateData.value = data.value;
    }

    if (data.position !== undefined) {
      updateData.position = data.position;
    }

    if (data.color_hex !== undefined) {
      updateData.color_hex =
        option.type === "COLOR" ? data.color_hex : null;
    }

    if (data.image_url !== undefined) {
      updateData.image_url =
        option.type === "IMAGE" ? data.image_url : null;
    }

    await prisma.productOptionValue.update({
      where: { id_store_id: { id: valueId, store_id: storeId } },
      data: updateData,
    });

    return this.getById(storeId, productId, optionId);
  }

  /**
   * Deletes an option value.
   * Validates value exists for the option in the store.
   */
  async deleteValue(
    storeId: number,
    productId: number,
    optionId: number,
    valueId: number,
  ) {
    // Validate option exists for this product in this store
    const option = await prisma.productOption.findFirst({
      where: { id: optionId, product_id: productId, store_id: storeId },
    });

    if (!option) {
      throw AppError.notFound("Product option not found");
    }

    // Validate value exists for this option
    const optionValue = await prisma.productOptionValue.findFirst({
      where: { id: valueId, option_id: optionId, store_id: storeId },
    });

    if (!optionValue) {
      throw AppError.notFound("Option value not found");
    }

    // Delete the option value
    await prisma.productOptionValue.delete({
      where: { id_store_id: { id: valueId, store_id: storeId } },
    });
    return this.getById(storeId, productId, optionId);
  }
}

export const productOptionService = new ProductOptionService();
