import { z } from "zod";

/**
 * Role Validation Schemas
 * Validates: Requirements 13.4
 */

export const roleSchema = z.object({
  name: z
    .string()
    .min(2, "Role name must be at least 2 characters")
    .max(50, "Role name must not exceed 50 characters"),
  description: z
    .string()
    .max(255, "Description must not exceed 255 characters")
    .nullish(),
});

export type RoleFormData = z.infer<typeof roleSchema>;
