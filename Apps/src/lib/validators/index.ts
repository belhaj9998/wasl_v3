/**
 * Zod Validation Schemas - Barrel Export
 * All form validation schemas for the application
 */

export {
  getValidationMessages,
  defaultValidationMessages,
  createZodErrorMap,
} from "./messages";
export type { TranslationFn, ValidationMessages } from "./messages";

export { loginSchema, registerSchema } from "./auth.schema";
export type { LoginFormData, RegisterFormData } from "./auth.schema";

export { productSchema } from "./product.schema";
export type { ProductFormData } from "./product.schema";

export { manualOrderSchema, shippingAddressSchema } from "./order.schema";
export type {
  ManualOrderFormData,
  ShippingAddressFormData,
} from "./order.schema";

export { checkoutSchema } from "./checkout.schema";
export type { CheckoutFormData } from "./checkout.schema";

export { couponSchema } from "./coupon.schema";
export type { CouponFormData } from "./coupon.schema";

export { customerSchema } from "./customer.schema";
export type { CustomerFormData } from "./customer.schema";

export { categorySchema } from "./category.schema";
export type { CategoryFormData } from "./category.schema";

export {
  generalSettingsSchema,
  seoSettingsSchema,
  contactSettingsSchema,
} from "./settings.schema";
export type {
  GeneralSettingsFormData,
  SeoSettingsFormData,
  ContactSettingsFormData,
} from "./settings.schema";

export { inviteMemberSchema } from "./member.schema";
export type { InviteMemberFormData } from "./member.schema";

export { roleSchema } from "./role.schema";
export type { RoleFormData } from "./role.schema";

export { planSchema } from "./plan.schema";
export type { PlanFormData } from "./plan.schema";

export { inventoryAdjustmentSchema } from "./inventory.schema";
export type { InventoryAdjustmentFormData } from "./inventory.schema";

export { createStoreSchema } from "./store.schema";
export type { CreateStoreFormData } from "./store.schema";

export {
  validateFile,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_FILE_VALIDATION_CONFIG,
} from "./fileValidation";
export type {
  FileValidationConfig,
  FileValidationResult,
  AllowedImageType,
} from "./fileValidation";
