import { z } from "zod";

/**
 * Allowed color preset identifiers for order tags.
 * Mirrors the `OrderTagColorPreset` Prisma enum exactly.
 *
 * The UI maps each preset to a Tailwind class set; no free-form hex values.
 * Validates: Requirements 1.6
 */
export const COLOR_PRESETS = [
  "slate",
  "gray",
  "red",
  "orange",
  "amber",
  "yellow",
  "green",
  "emerald",
  "teal",
  "sky",
  "blue",
  "indigo",
  "purple",
  "pink",
] as const;

export type OrderTagColorPresetValue = (typeof COLOR_PRESETS)[number];

/**
 * Tag name primitive: trims whitespace and enforces 1–30 char length post-trim.
 *
 * Validates: Requirements 1.7
 */
const tagName = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length >= 1 && v.length <= 30, {
    message: "Tag name must be 1-30 characters after trimming",
  });

/**
 * Body schema for `POST /order-tags`.
 * Validates: Requirements 1.1, 1.6, 1.7
 */
export const createOrderTagSchema = z.object({
  name: tagName,
  color_preset: z.enum(COLOR_PRESETS),
});

/**
 * Body schema for `PATCH /order-tags/:id`.
 * Validates: Requirements 1.3, 1.6, 1.7
 */
export const updateOrderTagSchema = z.object({
  name: tagName.optional(),
  color_preset: z.enum(COLOR_PRESETS).optional(),
});

/**
 * Body schema for `PUT /orders/:orderId/tags`.
 * Caps at MAX_TAGS_PER_ORDER (10) tag ids.
 * Validates: Requirements 2.1, 2.3
 */
export const replaceOrderTagsSchema = z.object({
  tag_ids: z.array(z.number().int().positive()).max(10),
});

/**
 * Body schema for `POST/DELETE /orders/bulk/tags`.
 * Validates: Requirements 3.1, 3.2
 */
export const bulkOrderTagsSchema = z.object({
  order_ids: z.array(z.number().int().positive()).min(1).max(500),
  tag_ids: z.array(z.number().int().positive()).min(1).max(50),
});

/**
 * Query schema for `GET /order-tags`.
 * Coerces `with_counts=true|1|...` into a boolean for downstream use.
 * Validates: Requirements 1.2, 10.1
 */
export const orderTagsListQuerySchema = z.object({
  with_counts: z.coerce.boolean().optional().default(false),
});

/**
 * Helper for parsing the `tag_ids` query parameter on the orders list /
 * counts endpoints. Accepts a comma-separated string and returns a sorted,
 * deduplicated number[] of positive integers.
 *
 * On any malformed value, emits a Zod issue with message `TAG_FILTER_INVALID`
 * so the upstream error handler can surface a 400 with that error code.
 *
 * Validates: Requirements 5.3, 8.3
 */
export const tagFilterIdsQuerySchema = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (!raw) return undefined;
    const parts = raw.split(",").map((s) => Number(s.trim()));
    if (parts.some((n) => !Number.isInteger(n) || n <= 0)) {
      ctx.addIssue({
        code: "custom",
        message: "TAG_FILTER_INVALID",
      });
      return z.NEVER;
    }
    return Array.from(new Set(parts)).sort((a, b) => a - b);
  });

/**
 * Route params for tag-definition endpoints (`/order-tags/:id`).
 */
export const orderTagIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

export type CreateOrderTagInput = z.infer<typeof createOrderTagSchema>;
export type UpdateOrderTagInput = z.infer<typeof updateOrderTagSchema>;
export type ReplaceOrderTagsInput = z.infer<typeof replaceOrderTagsSchema>;
export type BulkOrderTagsInput = z.infer<typeof bulkOrderTagsSchema>;
