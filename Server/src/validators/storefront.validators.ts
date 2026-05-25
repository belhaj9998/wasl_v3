import { z } from "zod";

// ─── Cart Schemas ────────────────────────────────────────────────────────────

/**
 * Add item to cart request body schema.
 * Validates: product_id and variant_id are positive integers, quantity is positive int (max 9999).
 * Requirements: 14.4, 6.13
 */
export const addToCartSchema = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(9999),
});

/**
 * Update cart item request body schema.
 * Quantity of 0 means remove the item.
 * Requirements: 14.4, 6.13
 */
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(9999),
});

// ─── Coupon Schemas ──────────────────────────────────────────────────────────

/**
 * Apply coupon request body schema.
 * Code must be 2-50 characters.
 * Requirements: 14.1
 */
export const applyCouponSchema = z.object({
  code: z.string().min(2).max(50),
});

// ─── Checkout Schemas ────────────────────────────────────────────────────────

/**
 * Checkout request body schema.
 * Validates customer info, shipping address, payment method, and optional notes.
 * Requirements: 14.2
 */
export const checkoutSchema = z.object({
  customer_name: z.string().min(2).max(100),
  customer_phone: z
    .string()
    .regex(/^\+218[0-9]{9}$/, "Invalid Libyan phone format"),

  shipping_address: z.object({
    full_name: z.string().min(1).max(200),
    phone: z.string().min(8).max(20).optional(),
    city: z.string().min(1).max(100),
    region: z.string().max(100).optional(),
    street_line_1: z.string().min(1).max(300),
    street_line_2: z.string().max(300).optional(),
    postal_code: z.string().max(20).optional(),
    google_maps_url: z.string().url().optional(),
  }),

  payment_method: z.enum([
    "CASH_ON_DELIVERY",
    "CARD",
    "BANK_TRANSFER",
    "WALLET",
    "MANUAL",
  ]),

  notes_from_customer: z.string().max(1000).optional(),
});

// ─── Customer Auth Schemas ───────────────────────────────────────────────────

/**
 * Customer registration request body schema.
 * Requirements: 14.3, 11.10
 */
export const customerRegisterSchema = z.object({
  customer_name: z.string().min(1).max(100),
  phone: z.string().min(8).max(20),
  password: z.string().min(8).max(128),
});

/**
 * Customer login request body schema.
 * Requirements: 14.1
 */
export const customerLoginSchema = z.object({
  phone: z.string().min(8).max(20),
  password: z.string().min(1),
});
// ─── Customer Profile Schemas ────────────────────────────────────────────────

/**
 * Update customer profile request body schema.
 * All fields optional for PATCH semantics.
 * Requirements: 14.1
 */
export const updateProfileSchema = z.object({
  customer_name: z.string().min(1).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  birth_date: z.coerce.date().optional(),
});

// ─── Address Schemas ─────────────────────────────────────────────────────────

/**
 * Add customer address request body schema.
 * Requires full_name, city, and street_line_1.
 * Requirements: 14.1
 */
export const addAddressSchema = z.object({
  full_name: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  street_line_1: z.string().min(1).max(300),
  type: z.enum(["SHIPPING", "BILLING", "OTHER"]).default("OTHER"),
  phone: z.string().min(8).max(20).optional(),
  region: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  street_line_2: z.string().max(300).optional(),
  postal_code: z.string().max(20).optional(),
  google_maps_url: z.string().url().optional(),
  is_default: z.boolean().default(false),
});

export const updateAddressSchema = addAddressSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

// ─── Order Lookup Schemas ────────────────────────────────────────────────────

/**
 * Guest order lookup query schema.
 * Requires order_number and a verification value (email or phone).
 * Requirements: 14.1
 */
export const orderLookupSchema = z.object({
  order_number: z.string().min(1),
  verification_value: z.string().min(1),
});

// ─── Product Query Schemas ───────────────────────────────────────────────────

/**
 * Product listing query schema.
 * Supports pagination, filtering by category and price range, and sorting.
 * Requirements: 5.9, 14.1
 */
export const productListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category_id: z.coerce.number().int().positive().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  sort_by: z.enum(["name", "price", "created_at"]).default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Product search query schema.
 * Requires a search query string (1-200 chars) with pagination.
 * Requirements: 5.9, 14.1
 */
export const productSearchQuerySchema = z.object({
  query: z.string().min(1).max(200),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Customer Orders Query Schema ────────────────────────────────────────────

/**
 * Customer orders listing query schema.
 * Supports pagination with max 100 per page.
 * Requirements: 14.1
 */
export const customerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
