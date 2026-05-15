import { z } from "zod";

/**
 * Checkout Validation Schemas
 * Validates: Requirements 18.1
 */

export const checkoutSchema = z.object({
  customer_name: z
    .string()
    .min(2, "Customer name must be at least 2 characters")
    .max(100, "Customer name must not exceed 100 characters"),
  customer_phone: z
    .string()
    .regex(/^\+218[0-9]{9}$/, "Phone must match Libyan format +218XXXXXXXXX"),
  customer_email: z.string().email("Invalid email format").nullish(),
  shipping_address: z.object({
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
  }),
  payment_method: z.enum(
    ["CASH_ON_DELIVERY", "CARD", "BANK_TRANSFER", "WALLET", "MANUAL"],
    { required_error: "Payment method is required" },
  ),
  notes_from_customer: z.string().max(1000).nullish(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
