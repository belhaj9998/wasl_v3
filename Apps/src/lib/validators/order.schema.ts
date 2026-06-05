import { z } from "zod";

/**
 * Order Validation Schemas
 * Validates: Requirements 9.4, 9.7
 */

const shippingAddressSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(200, "Full name must not exceed 200 characters"),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must not exceed 100 characters"),
  street_line_1: z
    .string()
    .min(1, "Street address is required")
    .max(300, "Street address must not exceed 300 characters"),
  street_line_2: z.string().max(300).optional().default(""),
  state: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  country: z.string().optional().default(""),
});

const orderItemSchema = z.object({
  product_id: z.number().int().positive("Product ID is required"),
  variant_id: z.number().int().positive("Variant ID is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(100, "Quantity must not exceed 100"),
});

export const manualOrderSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, "At least 1 item is required")
    .max(100, "Maximum 100 items allowed"),
  shipping_address: shippingAddressSchema,
  customer_id: z.number().int().positive().optional(),
  customer_name: z.string().optional().default(""),
  customer_phone: z.string().optional().default(""),
  customer_email: z.string().email().optional().or(z.literal("")),
  payment_method: z
    .enum(["CASH_ON_DELIVERY", "BANK_TRANSFER", "MANUAL"])
    .default("CASH_ON_DELIVERY"),
  notes_from_customer: z.string().max(1000).optional().default(""),
  source: z
    .enum(["ADMIN", "WHATSAPP", "PHONE", "INSTAGRAM", "FACEBOOK", "TIKTOK", "OTHER"])
    .optional()
    .default("ADMIN"),
});

export type ManualOrderFormData = z.infer<typeof manualOrderSchema>;
export type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>;

export { shippingAddressSchema };
