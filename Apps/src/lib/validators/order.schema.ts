import { z } from "zod";

/**
 * Order Validation Schemas
 * Validates: Requirements 9.4
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
  street_line_2: z.string().max(300).nullish(),
  state: z.string().nullish(),
  postal_code: z.string().nullish(),
  country: z.string().nullish(),
});

const orderItemSchema = z.object({
  product_id: z.number().int().positive("Product ID is required"),
  variant_id: z.number().int().positive("Variant ID is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(9999, "Quantity must not exceed 9999"),
});

export const manualOrderSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, "At least 1 item is required")
    .max(100, "Maximum 100 items allowed"),
  shipping_address: shippingAddressSchema,
  customer_name: z.string().min(1, "Customer name is required").optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().nullish(),
  payment_method: z
    .enum(["CASH_ON_DELIVERY", "CARD", "BANK_TRANSFER", "WALLET", "MANUAL"])
    .optional(),
  notes_from_customer: z.string().max(1000).nullish(),
  source: z
    .enum(["ADMIN", "MANUAL", "INSTAGRAM", "FACEBOOK", "TIKTOK"])
    .optional(),
});

export type ManualOrderFormData = z.infer<typeof manualOrderSchema>;
export type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>;

export { shippingAddressSchema };
