/**
 * Order Tag Form Validators
 *
 * Mirrors the backend Zod schema in `Server/src/validators/orderTag.validators.ts`:
 * trim → 1-30 char check → fixed enum of color presets.
 *
 * Used by `TagFormDialog` for client-side validation; the server still
 * enforces the same constraints and surfaces error codes (TAG_NAME_INVALID,
 * TAG_COLOR_INVALID, TAG_NAME_DUPLICATE) for unrecoverable cases.
 */

import { z } from "zod";

import { ORDER_TAG_COLOR_PRESETS } from "@/lib/constants/orderTagColors";
import type { OrderTagColorPreset } from "@/types/orderTag.types";

// Zod's `enum` requires a tuple with at least one literal. We have a runtime
// constant that's the canonical source of truth, so we cast through `unknown`
// to satisfy the tuple-shape requirement without re-listing every value.
const COLOR_PRESET_VALUES = ORDER_TAG_COLOR_PRESETS as unknown as readonly [
  OrderTagColorPreset,
  ...OrderTagColorPreset[],
];

export const orderTagNameSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length >= 1 && value.length <= 30, {
    message: "TAG_NAME_INVALID",
  });

export const orderTagColorSchema = z.enum(COLOR_PRESET_VALUES, {
  errorMap: () => ({ message: "TAG_COLOR_INVALID" }),
});

export const orderTagFormSchema = z.object({
  name: orderTagNameSchema,
  color_preset: orderTagColorSchema,
});

export type OrderTagFormValues = z.infer<typeof orderTagFormSchema>;
