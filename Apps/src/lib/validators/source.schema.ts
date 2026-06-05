import { z } from "zod";

export const editableOrderSourceSchema = z.enum([
  "STOREFRONT",
  "ADMIN",
  "WHATSAPP",
  "PHONE",
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "OTHER",
]);

export const updateOrderSourceSchema = z.object({
  source: editableOrderSourceSchema,
});

export type EditableOrderSource = z.infer<typeof editableOrderSourceSchema>;
export type UpdateOrderSourceFormData = z.infer<typeof updateOrderSourceSchema>;
