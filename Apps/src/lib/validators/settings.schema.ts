import { z } from "zod";

/**
 * Store Settings Validation Schemas
 * Validates: Requirements 14.1, 14.4, 14.5
 */

export const generalSettingsSchema = z.object({
  name: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(100, "Store name must not exceed 100 characters"),
  domain: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .max(63, "Domain must not exceed 63 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Domain must be lowercase alphanumeric with hyphens only",
    ),
});

export const seoSettingsSchema = z.object({
  meta_title: z
    .string()
    .max(70, "Meta title must not exceed 70 characters")
    .nullish(),
  meta_description: z
    .string()
    .max(160, "Meta description must not exceed 160 characters")
    .nullish(),
});

export const contactSettingsSchema = z.object({
  support_email: z
    .string()
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
  support_phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "Phone must match format +?[0-9]{7,15}")
    .optional()
    .or(z.literal("")),
  social_links: z.record(z.string().url("Invalid URL format")).nullish(),
});

export type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;
export type SeoSettingsFormData = z.infer<typeof seoSettingsSchema>;
export type ContactSettingsFormData = z.infer<typeof contactSettingsSchema>;
