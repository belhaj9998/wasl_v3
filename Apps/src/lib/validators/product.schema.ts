import { z } from "zod";

/**
 * Product Validation Schemas
 * Validates: Requirements 7.2
 */

export const productSchema = z.object({
  name: z
    .string()
    .min(2, "Product name must be at least 2 characters")
    .max(200, "Product name must not exceed 200 characters"),
  base_price: z
    .string()
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Base price must be a positive number" },
    )
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
      message: "Base price must have at most 2 decimal places",
    }),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens (store-unique pattern)",
    )
    .optional(),
  description: z.string().nullish(),
  short_description: z.string().nullish(),
  compare_at_price: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Compare at price must be a positive number" },
    )
    .refine(
      (val) => {
        if (!val) return true;
        return /^\d+(\.\d{1,2})?$/.test(val);
      },
      { message: "Compare at price must have at most 2 decimal places" },
    )
    .nullish(),
  cost_price: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: "Cost price must be a non-negative number" },
    )
    .nullish(),
  track_inventory: z.boolean().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
