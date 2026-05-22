import { z } from "zod";

const optionalPositiveMoneySchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().positive().nullable().optional(),
);

const optionalNonNegativeMoneySchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().min(0).nullable().optional(),
);

// ─── Category Schemas ────────────────────────────────────────────────────────

/**
 * Create category request body schema.
 * Requires name (2-100 chars), optional parent_id, image_url, and is_active.
 * Validates: Requirements 2.2
 */
export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  parent_id: z.number().int().positive().nullable().optional(),
  image_url: z.string().url().max(2048).nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

/**
 * Update category request body schema.
 * All fields optional for PATCH semantics.
 * Validates: Requirements 4.2
 */
export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  image_url: z.string().url().max(2048).nullable().optional(),
  is_active: z.boolean().optional(),
});

/**
 * Reorder categories request body schema.
 * Requires items array (1-500) with id, sort_order, and optional parent_id.
 * Validates: Requirements 6.2
 */
export const reorderCategoriesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        sort_order: z.number().int().min(0),
        parent_id: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1)
    .max(500),
});

/**
 * Category list query schema.
 * Supports pagination, parent_id filter, flat mode, and is_active filter.
 * Validates: Requirements 1.1, 1.3, 1.4, 1.5
 */
export const categoryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  parent_id: z.coerce.number().int().positive().nullable().optional(),
  flat: z.enum(["true", "false"]).optional().default("false"),
  is_active: z.enum(["true", "false"]).optional(),
});

// ─── Product Schemas ─────────────────────────────────────────────────────────

/**
 * Create product request body schema.
 * Requires name and base_price. Optional description, pricing, inventory, and category fields.
 * Validates: Requirements 8.2
 */
export const createProductSchema = z
  .object({
    name: z.string().min(2).max(200),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    description: z.string().max(5000).nullable().optional(),
    short_description: z.string().max(500).nullable().optional(),
    base_price: z.coerce.number().positive(),
    compare_at_price: optionalPositiveMoneySchema,
    cost_price: optionalNonNegativeMoneySchema,
    track_inventory: z.boolean().optional().default(true),
    has_variants: z.boolean().optional().default(false),
    status: z
      .enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED"])
      .optional()
      .default("DRAFT"),
    category_ids: z.array(z.number().int().positive()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (
      data.compare_at_price !== null &&
      data.compare_at_price !== undefined &&
      data.compare_at_price <= data.base_price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["compare_at_price"],
        message: "compare_at_price must be greater than base_price",
      });
    }
  });

/**
 * Update product request body schema.
 * All fields optional for PATCH semantics.
 * Validates: Requirements 10.2
 */
export const updateProductSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    description: z.string().max(5000).nullable().optional(),
    short_description: z.string().max(500).nullable().optional(),
    base_price: z.coerce.number().positive().optional(),
    compare_at_price: optionalPositiveMoneySchema,
    cost_price: optionalNonNegativeMoneySchema,
    track_inventory: z.boolean().optional(),
    category_ids: z.array(z.number().int().positive()).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.base_price !== undefined &&
      data.compare_at_price !== null &&
      data.compare_at_price !== undefined &&
      data.compare_at_price <= data.base_price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["compare_at_price"],
        message: "compare_at_price must be greater than base_price",
      });
    }
  });

/**
 * Update product status request body schema.
 * Requires status enum value.
 * Validates: Requirements 12.2
 */
export const updateProductStatusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"]),
});

/**
 * Publish/unpublish product request body schema.
 * Requires publish boolean.
 * Validates: Requirements 13.3
 */
export const publishProductSchema = z.object({
  publish: z.boolean(),
});

/**
 * Product list query schema.
 * Supports pagination, filtering by status/category/price/search, sorting, and published filter.
 * Validates: Requirements 7.1-7.11
 */
export const productListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  search: z.string().max(200).optional(),
  sort_by: z
    .enum(["name", "price", "created_at", "updated_at"])
    .optional()
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  is_published: z.enum(["true", "false"]).optional(),
});

// ─── Product Option Schemas ──────────────────────────────────────────────────

/**
 * Create product option request body schema.
 * Requires name (1-50 chars), optional position.
 * Validates: Requirements 16.2
 */
export const createOptionSchema = z.object({
  name: z.string().min(1).max(50),
  position: z.number().int().min(0).optional(),
});

/**
 * Update product option request body schema.
 * All fields optional for PATCH semantics.
 * Validates: Requirements 17.2
 */
export const updateOptionSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  position: z.number().int().min(0).optional(),
});

/**
 * Create option value request body schema.
 * Requires value (1-100 chars), optional position.
 * Validates: Requirements 19.2
 */
export const createOptionValueSchema = z.object({
  value: z.string().min(1).max(100),
  position: z.number().int().min(0).optional(),
});

/**
 * Update option value request body schema.
 * All fields optional for PATCH semantics.
 * Validates: Requirements 20.2
 */
export const updateOptionValueSchema = z.object({
  value: z.string().min(1).max(100).optional(),
  position: z.number().int().min(0).optional(),
});

// ─── Variant Schemas ─────────────────────────────────────────────────────────

/**
 * Create variant request body schema.
 * Requires title and sku. Optional barcode, pricing, weight, active status, and option values.
 * Validates: Requirements 23.2
 */
export const createVariantSchema = z
  .object({
    title: z.string().min(1).max(200),
    sku: z.string().min(1).max(100),
    barcode: z.string().max(100).nullable().optional(),
    price: optionalNonNegativeMoneySchema,
    compare_at_price: optionalNonNegativeMoneySchema,
    cost_price: optionalNonNegativeMoneySchema,
    weight_grams: z.coerce.number().int().min(0).nullable().optional(),
    is_active: z.boolean().optional().default(true),
    option_value_ids: z
      .array(z.number().int().positive())
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (
      data.price !== null &&
      data.price !== undefined &&
      data.compare_at_price !== null &&
      data.compare_at_price !== undefined &&
      data.compare_at_price <= data.price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["compare_at_price"],
        message: "compare_at_price must be greater than price",
      });
    }
  });

/**
 * Update variant request body schema.
 * All fields optional for PATCH semantics.
 * Validates: Requirements 25.2
 */
export const updateVariantSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    sku: z.string().min(1).max(100).optional(),
    barcode: z.string().max(100).nullable().optional(),
    price: optionalNonNegativeMoneySchema,
    compare_at_price: optionalNonNegativeMoneySchema,
    cost_price: optionalNonNegativeMoneySchema,
    weight_grams: z.coerce.number().int().min(0).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.price !== null &&
      data.price !== undefined &&
      data.compare_at_price !== null &&
      data.compare_at_price !== undefined &&
      data.compare_at_price <= data.price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["compare_at_price"],
        message: "compare_at_price must be greater than price",
      });
    }
  });

// ─── Inventory Schemas ───────────────────────────────────────────────────────

/**
 * Adjust inventory request body schema.
 * Requires type and quantity. Optional reason and reference fields.
 * Validates: Requirements 32.2
 */
export const adjustInventorySchema = z.object({
  type: z.enum(["IN", "ADJUSTMENT_IN", "OUT", "ADJUSTMENT_OUT"]),
  quantity: z.number().int().positive(),
  reason: z.string().max(500).optional(),
  reference_type: z.string().max(50).optional(),
  reference_id: z.number().int().positive().optional(),
});

/**
 * Inventory list query schema.
 * Supports pagination, search, and low_stock_only filter.
 * Validates: Requirements 30.1
 */
export const inventoryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  low_stock_only: z.enum(["true", "false"]).optional(),
});

/**
 * Inventory movement list query schema.
 * Supports pagination, type filter, and date range.
 * Validates: Requirements 33.1
 */
export const movementListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z
    .enum([
      "IN",
      "ADJUSTMENT_IN",
      "OUT",
      "ADJUSTMENT_OUT",
      "RESERVED",
      "RELEASED",
      "RETURNED",
    ])
    .optional(),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
});

// ─── Media Schemas ───────────────────────────────────────────────────────────

/**
 * Update media request body schema.
 * Optional alt_text (nullable for clearing).
 * Validates: Requirements 36.2
 */
export const updateMediaSchema = z.object({
  alt_text: z.string().max(500).nullable().optional(),
});

/**
 * Reorder media request body schema.
 * Requires items array (1-50) with id and sort_order.
 * Validates: Requirements 38.2
 */
export const reorderMediaSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        sort_order: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(50),
});

// ─── Param Schemas ───────────────────────────────────────────────────────────

/**
 * Route params schema for store-scoped endpoints.
 * Coerces string param to positive integer.
 */
export const storeIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
});

/**
 * Route params schema for category endpoints.
 * Coerces string params to positive integers.
 */
export const categoryIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

/**
 * Route params schema for product endpoints.
 * Coerces string params to positive integers.
 */
export const productIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

/**
 * Route params schema for product media endpoints.
 * Coerces string params to positive integers.
 */
export const productMediaIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

/**
 * Route params schema for product option endpoints.
 * Coerces string params to positive integers.
 */
export const productOptionIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive(),
  optionId: z.coerce.number().int().positive(),
});

/**
 * Route params schema for option value endpoints.
 * Coerces string params to positive integers.
 */
export const optionValueIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive(),
  optionId: z.coerce.number().int().positive(),
  valueId: z.coerce.number().int().positive(),
});

/**
 * Route params schema for variant endpoints.
 * Coerces string params to positive integers.
 */
export const variantIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

/**
 * Route params schema for inventory variant endpoints.
 * Coerces string params to positive integers.
 */
export const inventoryVariantIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive(),
});
