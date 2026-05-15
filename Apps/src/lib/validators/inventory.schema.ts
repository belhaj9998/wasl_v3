import { z } from "zod";

/**
 * Inventory Validation Schemas
 * Validates: Requirements 12.3
 */

export const inventoryAdjustmentSchema = z.object({
  type: z.enum(["IN", "ADJUSTMENT_IN", "OUT", "ADJUSTMENT_OUT"], {
    required_error: "Adjustment type is required",
  }),
  quantity_change: z
    .number({ required_error: "Quantity is required" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(99999, "Quantity must not exceed 99,999"),
  reason: z
    .string()
    .max(500, "Reason must not exceed 500 characters")
    .nullish(),
  variant_id: z.number().int().positive().optional(),
});

export type InventoryAdjustmentFormData = z.infer<
  typeof inventoryAdjustmentSchema
>;
