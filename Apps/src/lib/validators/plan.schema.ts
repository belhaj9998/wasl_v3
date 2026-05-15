import { z } from "zod";

/**
 * Plan Validation Schemas
 * Validates: Requirements 21.1 (via 5.1)
 */

export const planSchema = z.object({
  code: z
    .string()
    .min(1, "Plan code is required")
    .max(50, "Plan code must not exceed 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Plan code must be lowercase alphanumeric with hyphens only",
    ),
  name: z
    .string()
    .min(1, "Plan name is required")
    .max(100, "Plan name must not exceed 100 characters"),
  price_monthly: z
    .number()
    .min(0.01, "Monthly price must be at least 0.01")
    .max(999999.99, "Monthly price must not exceed 999,999.99"),
  price_yearly: z
    .number()
    .min(0.01, "Yearly price must be at least 0.01")
    .max(9999999.99, "Yearly price must not exceed 9,999,999.99")
    .nullish(),
  max_stores: z.number().int().min(1).max(10000).nullish(),
  max_products: z.number().int().min(1).max(1000000).nullish(),
  max_staff: z.number().int().min(1).max(10000).nullish(),
  is_active: z.boolean().optional(),
});

export type PlanFormData = z.infer<typeof planSchema>;
