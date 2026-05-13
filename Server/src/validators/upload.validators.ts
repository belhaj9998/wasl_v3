import { z } from "zod";

// ─── Image Upload Options Schema ─────────────────────────────────────────────

/**
 * Schema for image upload options (parsed from request body).
 * All fields are optional — defaults are applied by the Upload Service.
 * Validates: Requirements 9.1
 */
export const imageUploadOptionsSchema = z.object({
  maxWidth: z.coerce.number().int().positive().max(4096).optional(),
  maxHeight: z.coerce.number().int().positive().max(4096).optional(),
  quality: z.coerce.number().int().min(1).max(100).optional(),
  format: z.enum(["webp", "jpeg", "png"]).optional(),
});

// ─── File Key Param Schema ───────────────────────────────────────────────────

/**
 * Route param schema for file deletion.
 * The key is the relative path within the uploads directory (e.g., "store-1/images/uuid.webp").
 * Validates: Requirements 9.1
 */
export const fileKeyParamSchema = z.object({
  key: z.string().min(1),
});
