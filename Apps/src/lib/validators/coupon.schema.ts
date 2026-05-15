import { z } from "zod";

/**
 * Coupon Validation Schemas
 * Validates: Requirements 11.1
 */

export const couponSchema = z
  .object({
    code: z
      .string()
      .min(2, "Coupon code must be at least 2 characters")
      .max(50, "Coupon code must not exceed 50 characters"),
    type: z.enum(["PERCENTAGE", "FIXED"], {
      required_error: "Coupon type is required",
    }),
    value: z.number().positive("Value must be greater than 0"),
    minimum_order_amount: z
      .number()
      .min(0, "Minimum order amount must be non-negative")
      .nullish(),
    maximum_discount_amount: z
      .number()
      .positive("Maximum discount amount must be positive")
      .nullish(),
    usage_limit: z
      .number()
      .int()
      .positive("Usage limit must be a positive integer")
      .nullish(),
    usage_limit_per_customer: z
      .number()
      .int()
      .positive("Usage limit per customer must be a positive integer")
      .nullish(),
    starts_at: z.string().nullish(),
    ends_at: z.string().nullish(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "PERCENTAGE") {
        return data.value >= 1 && data.value <= 100;
      }
      return true;
    },
    {
      message: "Percentage value must be between 1 and 100",
      path: ["value"],
    },
  )
  .refine(
    (data) => {
      if (data.starts_at && data.ends_at) {
        return new Date(data.starts_at) < new Date(data.ends_at);
      }
      return true;
    },
    {
      message: "Start date must be before end date",
      path: ["ends_at"],
    },
  );

export type CouponFormData = z.infer<typeof couponSchema>;
