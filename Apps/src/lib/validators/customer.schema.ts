import { z } from "zod";

/**
 * Customer Validation Schemas
 * Validates: Requirements 10.3
 */

export const customerSchema = z
  .object({
    customer_name: z
      .string()
      .min(1, "First name must be at least 1 character")
      .max(100, "First name must not exceed 100 characters")
      .optional(),
    email: z
      .string()
      .email("Invalid email format")
      .max(255, "Email must not exceed 255 characters")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .min(8, "Phone must be at least 8 characters")
      .max(20, "Phone must not exceed 20 characters")
      .optional()
      .or(z.literal("")),
    notes: z
      .string()
      .max(1000, "Notes must not exceed 1000 characters")
      .nullish(),
    status: z.enum(["ACTIVE", "BLOCKED", "ARCHIVED"]).optional(),
    gender: z.string().nullish(),
    birth_date: z.string().nullish(),
  })
  .refine(
    (data) => {
      const hasEmail = data.email && data.email.length > 0;
      const hasPhone = data.phone && data.phone.length > 0;
      return hasEmail || hasPhone;
    },
    {
      message: "At least one of email or phone is required",
      path: ["email"],
    },
  );

export type CustomerFormData = z.infer<typeof customerSchema>;
