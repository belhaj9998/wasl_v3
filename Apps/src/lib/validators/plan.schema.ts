import { z } from "zod";

/**
 * Plan Validation Schemas
 * Validates: Requirements 9.6
 *
 * Fields:
 * - name: 1-100 characters
 * - code: 1-50 characters, lowercase alphanumeric + dashes
 * - price_monthly: 0.01-999,999.99
 * - price_yearly: optional, 0.01-9,999,999.99
 * - max_products: 1-1,000,000
 * - max_staff: 1-10,000
 * - max_stores: 1-10,000
 */

export const planSchema = z.object({
  name: z
    .string()
    .min(1, "validation.plan.nameRequired")
    .max(100, "validation.plan.nameMax"),
  code: z
    .string()
    .min(1, "validation.plan.codeRequired")
    .max(50, "validation.plan.codeMax")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "validation.plan.codeFormat"),
  price_monthly: z
    .number({ invalid_type_error: "validation.plan.priceMonthlyRequired" })
    .min(0.01, "validation.plan.priceMonthlyMin")
    .max(999999.99, "validation.plan.priceMonthlyMax"),
  price_yearly: z
    .number()
    .min(0.01, "validation.plan.priceYearlyMin")
    .max(9999999.99, "validation.plan.priceYearlyMax")
    .nullish(),
  max_products: z
    .number({ invalid_type_error: "validation.plan.maxProductsRequired" })
    .int("validation.plan.maxProductsInt")
    .min(1, "validation.plan.maxProductsMin")
    .max(1000000, "validation.plan.maxProductsMax")
    .nullish(),
  max_staff: z
    .number({ invalid_type_error: "validation.plan.maxStaffRequired" })
    .int("validation.plan.maxStaffInt")
    .min(1, "validation.plan.maxStaffMin")
    .max(10000, "validation.plan.maxStaffMax")
    .nullish(),
  max_stores: z
    .number({ invalid_type_error: "validation.plan.maxStoresRequired" })
    .int("validation.plan.maxStoresInt")
    .min(1, "validation.plan.maxStoresMin")
    .max(10000, "validation.plan.maxStoresMax")
    .nullish(),
  is_active: z.boolean().optional(),
});

export type PlanFormData = z.infer<typeof planSchema>;
