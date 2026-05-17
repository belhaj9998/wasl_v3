import { z } from "zod";

/**
 * Checkout Validation Schemas — Multi-Step
 * Validates: Requirements 8.5, 9.11
 *
 * 4 steps: Customer Info → Address → Payment Method → Review
 * Each step has its own Zod schema for validation before proceeding.
 */

// Step 1: Customer Information
export const checkoutCustomerSchema = z.object({
  customer_name: z
    .string()
    .min(2, "Customer name must be at least 2 characters")
    .max(100, "Customer name must not exceed 100 characters"),
  customer_phone: z
    .string()
    .regex(/^\+218[0-9]{9}$/, "Phone must match Libyan format +218XXXXXXXXX"),
  customer_email: z
    .string()
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
});

// Step 2: Shipping Address
export const checkoutAddressSchema = z.object({
  full_name: z
    .string()
    .min(2, "Full name is required")
    .max(100, "Full name must not exceed 100 characters"),
  city: z
    .string()
    .min(2, "City is required")
    .max(100, "City must not exceed 100 characters"),
  street_line_1: z
    .string()
    .min(2, "Street address is required")
    .max(200, "Street address must not exceed 200 characters"),
  region: z.string().max(100).optional().or(z.literal("")),
  street_line_2: z.string().max(200).optional().or(z.literal("")),
  postal_code: z.string().max(10).optional().or(z.literal("")),
});

// Step 3: Payment Method
export const checkoutPaymentSchema = z.object({
  payment_method: z.enum(["CASH_ON_DELIVERY", "BANK_TRANSFER", "MANUAL"], {
    required_error: "Payment method is required",
  }),
  notes_from_customer: z.string().max(1000).optional().or(z.literal("")),
});

// Combined schema (for final submission)
export const checkoutSchema = z.object({
  customer_name: z
    .string()
    .min(2, "Customer name must be at least 2 characters")
    .max(100, "Customer name must not exceed 100 characters"),
  customer_phone: z
    .string()
    .regex(/^\+218[0-9]{9}$/, "Phone must match Libyan format +218XXXXXXXXX"),
  customer_email: z
    .string()
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
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
export type CheckoutCustomerData = z.infer<typeof checkoutCustomerSchema>;
export type CheckoutAddressData = z.infer<typeof checkoutAddressSchema>;
export type CheckoutPaymentData = z.infer<typeof checkoutPaymentSchema>;

// Step definitions for the multi-step checkout
export const CHECKOUT_STEPS = [
  "customer",
  "address",
  "payment",
  "review",
] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];
