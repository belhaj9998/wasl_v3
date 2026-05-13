import { z } from "zod";

/**
 * Pagination query schema.
 * Coerces string inputs to numbers (common for query params).
 * Applies defaults for missing fields.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Route param schema for a single resource ID.
 * Coerces string param to a positive integer.
 */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Route param schema for store ID.
 * Coerces string param to a positive integer.
 */
export const storeIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
});
