import { z } from "zod";

/**
 * Category Validation Schemas
 * Validates: Requirements 12.3 (via 8.2)
 */

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must not exceed 100 characters"),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens",
    )
    .optional(),
  description: z.string().nullish(),
  parent_id: z.number().int().positive().nullish(),
  image_url: z.string().nullish(),
  is_active: z.boolean().optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
