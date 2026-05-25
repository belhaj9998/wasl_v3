import { z } from "zod";

/**
 * Product Validation Schemas
 * Validates: Requirements 7.2, 9.4, 9.5, 6.6
 */

const optionalSlugSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "الرابط المختصر يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط",
    )
    .optional(),
);

export const productSchema = z
  .object({
  name: z
    .string()
    .min(2, "اسم المنتج يجب أن يكون حرفين على الأقل")
    .max(200, "اسم المنتج يجب ألا يتجاوز 200 حرف"),
  base_price: z
    .string()
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "السعر الأساسي يجب أن يكون رقماً موجباً" },
    )
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
      message: "السعر الأساسي يجب ألا يحتوي على أكثر من رقمين عشريين",
    }),
  slug: optionalSlugSchema,
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
      { message: "السعر قبل الخصم يجب أن يكون رقماً موجباً" },
    )
    .refine(
      (val) => {
        if (!val) return true;
        return /^\d+(\.\d{1,2})?$/.test(val);
      },
      { message: "السعر قبل الخصم يجب ألا يحتوي على أكثر من رقمين عشريين" },
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
      { message: "سعر التكلفة يجب أن يكون صفراً أو أكثر" },
    )
    .nullish(),
  track_inventory: z.boolean().optional(),
  has_variants: z.boolean().optional(),
  inventory_quantity: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        const num = Number(val);
        return Number.isInteger(num) && num >= 0;
      },
      { message: "كمية المخزون يجب أن تكون رقماً صحيحاً لا يقل عن صفر" },
    )
    .optional(),
  low_stock_threshold: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        const num = Number(val);
        return Number.isInteger(num) && num >= 0;
      },
      { message: "حد التنبيه يجب أن يكون رقماً صحيحاً لا يقل عن صفر" },
    )
    .optional(),
  status: z
    .enum(["DRAFT", "HIDDEN", "PUBLISHED", "ARCHIVED"])
    .optional(),
  meta_title: z
    .string()
    .max(70, "عنوان SEO يجب ألا يتجاوز 70 حرفاً")
    .nullish(),
  meta_description: z
    .string()
    .max(160, "وصف SEO يجب ألا يتجاوز 160 حرفاً")
    .nullish(),
  })
  .superRefine((data, ctx) => {
    if (!data.compare_at_price) {
      return;
    }

    const basePrice = parseFloat(data.base_price);
    const compareAtPrice = parseFloat(data.compare_at_price);

    if (
      !Number.isNaN(basePrice) &&
      !Number.isNaN(compareAtPrice) &&
      compareAtPrice <= basePrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["compare_at_price"],
        message: "يجب أن يكون السعر قبل الخصم أعلى من السعر الأساسي",
      });
    }
  });

export type ProductFormData = z.infer<typeof productSchema>;
