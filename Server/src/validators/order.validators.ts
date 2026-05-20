import { z } from "zod";

// ─── Customer Schemas ────────────────────────────────────────────────────────

/**
 * Create customer request body schema.
 * At least one of email or phone must be provided (enforced at service layer).
 * Validates: Requirements 2.2
 */
export const createCustomerSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().min(8).max(20).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  birth_date: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "ARCHIVED"]).optional(),
});

/**
 * Update customer request body schema.
 * All fields optional for PATCH semantics. Nullable fields use .nullable().optional().
 * Validates: Requirements 4.2
 */
export const updateCustomerSchema = z.object({
  first_name: z.string().min(1).max(100).nullable().optional(),
  last_name: z.string().min(1).max(100).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().min(8).max(20).nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  birth_date: z.coerce.date().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "ARCHIVED"]).optional(),
});

/**
 * Customer list query schema.
 * Supports pagination, search, status filter, and sorting.
 * Validates: Requirements 2.2
 */
export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "ARCHIVED"]).optional(),
  sort_by: z
    .enum(["created_at", "first_name", "last_name"])
    .optional()
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ─── Address Schemas ─────────────────────────────────────────────────────────

/**
 * Create address request body schema.
 * Requires full_name, city, and street_line_1.
 * Validates: Requirements 8.2
 */
export const createAddressSchema = z.object({
  type: z.enum(["SHIPPING", "BILLING", "OTHER"]).default("OTHER"),
  full_name: z.string().min(1).max(200),
  phone: z.string().min(8).max(20).optional(),
  city: z.string().min(1).max(100),
  region: z.string().max(100).optional(),
  street_line_1: z.string().min(1).max(300),
  street_line_2: z.string().max(300).optional(),
  postal_code: z.string().max(20).optional(),
  google_maps_url: z.string().url().optional(),
  is_default: z.boolean().default(false),
});

/**
 * Update address request body schema.
 * All fields optional for PATCH semantics.
 * Validates: Requirements 9.1
 */
export const updateAddressSchema = z.object({
  type: z.enum(["SHIPPING", "BILLING", "OTHER"]).optional(),
  full_name: z.string().min(1).max(200).optional(),
  phone: z.string().min(8).max(20).nullable().optional(),
  city: z.string().min(1).max(100).optional(),
  region: z.string().max(100).nullable().optional(),
  street_line_1: z.string().min(1).max(300).optional(),
  street_line_2: z.string().max(300).nullable().optional(),
  postal_code: z.string().max(20).nullable().optional(),
  google_maps_url: z.string().url().nullable().optional(),
  is_default: z.boolean().optional(),
});

// ─── Coupon Schemas ──────────────────────────────────────────────────────────

/**
 * Create coupon request body schema.
 * Includes .transform() for code uppercase and .refine() for percentage/date validation.
 * Validates: Requirements 13.2
 */
export const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(2)
      .max(50)
      .transform((v) => v.toUpperCase()),
    description: z.string().max(500).optional(),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.number().positive(),
    minimum_order_amount: z.number().nonnegative().optional(),
    maximum_discount_amount: z.number().positive().optional(),
    usage_limit: z.number().int().positive().optional(),
    usage_limit_per_customer: z.number().int().positive().optional(),
    starts_at: z.coerce.date().optional(),
    ends_at: z.coerce.date().optional(),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) =>
      data.type !== "PERCENTAGE" || (data.value > 0 && data.value <= 100),
    { message: "Percentage value must be between 1 and 100" },
  )
  .refine(
    (data) => !data.starts_at || !data.ends_at || data.starts_at < data.ends_at,
    { message: "starts_at must be before ends_at" },
  );

/**
 * Update coupon request body schema.
 * All fields optional for PATCH semantics. Includes same refinements.
 * Validates: Requirements 15.2
 */
export const updateCouponSchema = z
  .object({
    code: z
      .string()
      .min(2)
      .max(50)
      .transform((v) => v.toUpperCase())
      .optional(),
    description: z.string().max(500).nullable().optional(),
    type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
    value: z.number().positive().optional(),
    minimum_order_amount: z.number().nonnegative().nullable().optional(),
    maximum_discount_amount: z.number().positive().nullable().optional(),
    usage_limit: z.number().int().positive().nullable().optional(),
    usage_limit_per_customer: z.number().int().positive().nullable().optional(),
    starts_at: z.coerce.date().nullable().optional(),
    ends_at: z.coerce.date().nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.type !== "PERCENTAGE" ||
      !data.value ||
      (data.value > 0 && data.value <= 100),
    { message: "Percentage value must be between 1 and 100" },
  )
  .refine(
    (data) => !data.starts_at || !data.ends_at || data.starts_at < data.ends_at,
    { message: "starts_at must be before ends_at" },
  );

/**
 * Coupon list query schema.
 * Supports pagination, search, is_active filter, type filter, and sorting.
 * Validates: Requirements 13.2
 */
export const couponListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  is_active: z.enum(["true", "false"]).optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  sort_by: z
    .enum(["created_at", "code", "starts_at", "ends_at"])
    .optional()
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ─── Order Schemas ───────────────────────────────────────────────────────────

/**
 * Create order item schema (used within createOrderSchema).
 */
const createOrderItemSchema = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(9999),
});

/**
 * Create order request body schema.
 * Requires at least one item and a shipping address.
 * Validates: Requirements 20.2
 */
export const createOrderSchema = z.object({
  customer_id: z.number().int().positive().optional(),
  source: z
    .enum(["STOREFRONT", "ADMIN", "MANUAL", "INSTAGRAM", "FACEBOOK", "TIKTOK"])
    .default("ADMIN"),
  items: z.array(createOrderItemSchema).min(1),
  shipping_address: createAddressSchema,
  billing_address: createAddressSchema.optional(),
  coupon_code: z.string().optional(),
  shipping_total: z.number().nonnegative().default(0),
  notes_from_customer: z.string().max(1000).optional(),
  notes_internal: z.string().max(1000).optional(),
});

/**
 * Order list query schema.
 * Supports pagination, search, multiple filters, and sorting.
 * Validates: Requirements 22.2
 */
export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z
    .enum([
      "DRAFT",
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "PREPARING",
      "SHIPPED",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELED",
      "RETURNED",
    ])
    .optional(),
  payment_status: z
    .enum([
      "UNPAID",
      "PENDING",
      "PARTIALLY_PAID",
      "PAID",
      "FAILED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
    ])
    .optional(),
  source: z
    .enum(["STOREFRONT", "ADMIN", "MANUAL", "INSTAGRAM", "FACEBOOK", "TIKTOK"])
    .optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  amount_min: z.coerce.number().min(0).optional(),
  amount_max: z.coerce.number().min(0).optional(),
  sort_by: z
    .enum(["placed_at", "grand_total", "order_number"])
    .optional()
    .default("placed_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Update order status request body schema.
 * Validates: Requirements 22.2
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "PREPARING",
    "SHIPPED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELED",
    "RETURNED",
  ]),
  note: z.string().max(1000).optional(),
});

/**
 * Update payment status request body schema.
 * Validates: Requirements 28.2
 */
export const updatePaymentStatusSchema = z.object({
  payment_status: z.enum([
    "UNPAID",
    "PENDING",
    "PARTIALLY_PAID",
    "PAID",
    "FAILED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
  ]),
  note: z.string().max(1000).optional(),
});

/**
 * Add order note request body schema.
 * Validates: Requirements 29.2
 */
export const addOrderNoteSchema = z.object({
  note: z.string().min(1).max(1000),
});

// ─── Shipment Schemas ────────────────────────────────────────────────────────

/**
 * Create shipment request body schema.
 * Requires provider name.
 * Validates: Requirements 32.2
 */
export const createShipmentSchema = z.object({
  provider: z.string().min(1).max(100),
  service_name: z.string().max(100).optional(),
  tracking_number: z.string().max(100).optional(),
  shipping_cost: z.number().nonnegative().default(0),
  expected_delivery_at: z.coerce.date().optional(),
});

/**
 * Update shipment request body schema.
 * All fields optional for PATCH semantics.
 * Validates: Requirements 33.2
 */
export const updateShipmentSchema = z.object({
  provider: z.string().min(1).max(100).optional(),
  service_name: z.string().max(100).nullable().optional(),
  tracking_number: z.string().max(100).nullable().optional(),
  shipping_cost: z.number().nonnegative().optional(),
  expected_delivery_at: z.coerce.date().nullable().optional(),
});

/**
 * Update shipment status request body schema.
 * Validates: Requirements 33.2
 */
export const updateShipmentStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "PREPARING",
    "SHIPPED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELED",
    "RETURNED",
  ]),
});

// ─── Payment Schemas ─────────────────────────────────────────────────────────

/**
 * Record payment request body schema.
 * Requires method and positive amount.
 * Validates: Requirements 36.6
 */
export const recordPaymentSchema = z.object({
  method: z.enum([
    "CASH_ON_DELIVERY",
    "CARD",
    "BANK_TRANSFER",
    "WALLET",
    "MANUAL",
  ]),
  amount: z.number().positive(),
  currency_code: z.string().length(3).default("LYD"),
  provider: z.string().max(100).optional(),
  transaction_reference: z.string().max(255).optional(),
  payment_link: z.string().url().optional(),
  paid_at: z.coerce.date().optional(),
});

/**
 * Process refund request body schema.
 * Requires positive amount and optional reason.
 * Validates: Requirements 36.6
 */
export const processRefundSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().max(500).optional(),
});

// ─── Dashboard Schemas ───────────────────────────────────────────────────────

/**
 * Sales statistics query schema.
 * Requires period, optional date range.
 * Validates: Requirements 36.6
 */
export const salesStatQuerySchema = z.object({
  period: z.enum(["day", "week", "month"]),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
});

/**
 * Dashboard pagination query schema.
 * Simple pagination for dashboard list endpoints (e.g., inventory alerts).
 * Validates: Requirements 36.6
 */
export const dashboardPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Param Schemas ───────────────────────────────────────────────────────────

/**
 * Route params schema for customer endpoints.
 * Coerces string params to positive integers.
 */
export const customerIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  customerId: z.coerce.number().int().positive(),
});

/**
 * Route params schema for address endpoints.
 * Coerces string params to positive integers.
 */
export const addressIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  customerId: z.coerce.number().int().positive(),
  addressId: z.coerce.number().int().positive(),
});

/**
 * Route params schema for coupon endpoints.
 * Coerces string params to positive integers.
 */
export const couponIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  couponId: z.coerce.number().int().positive(),
});

/**
 * Route params schema for order endpoints.
 * Coerces string params to positive integers.
 */
export const orderIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  orderId: z.coerce.number().int().positive(),
});

/**
 * Route params schema for shipment endpoints.
 * Coerces string params to positive integers.
 */
export const shipmentIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  shipmentId: z.coerce.number().int().positive(),
});
