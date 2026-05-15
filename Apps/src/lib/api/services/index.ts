/**
 * API Services barrel export
 */

export { authService } from "./auth.service";
export { productService } from "./product.service";
export { orderService } from "./order.service";
export { categoryService } from "./category.service";
export { customerService } from "./customer.service";
export { couponService } from "./coupon.service";
export { inventoryService } from "./inventory.service";
export { memberService } from "./member.service";
export { roleService } from "./role.service";
export { platformService } from "./platform.service";
export { storefrontService } from "./storefront.service";
export { uploadService } from "./upload.service";
export { storeSettingsService } from "./storeSettings.service";

// Re-export payload types for convenience
export type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  CreateStorePayload,
} from "./auth.service";
export type {
  CreateProductPayload,
  UpdateProductPayload,
} from "./product.service";
export type {
  CreateOrderPayload,
  UpdateOrderStatusPayload,
  AddNotePayload,
} from "./order.service";
export type {
  CreateCategoryPayload,
  UpdateCategoryPayload,
  ReorderPayload,
} from "./category.service";
export type {
  CreateCustomerPayload,
  UpdateCustomerPayload,
  AddAddressPayload,
  UpdateAddressPayload,
} from "./customer.service";
export type {
  CreateCouponPayload,
  UpdateCouponPayload,
  ValidateCouponPayload,
  CouponUsage,
  ValidateCouponResult,
} from "./coupon.service";
export type {
  AdjustInventoryPayload,
  InventoryItem,
} from "./inventory.service";
export type {
  Member,
  InviteMemberPayload,
  ChangeRolePayload,
} from "./member.service";
export type {
  Role,
  CreateRolePayload,
  UpdateRolePayload,
  UpdatePermissionsPayload,
} from "./role.service";
export type {
  UpdateUserPayload,
  UpdateStoreStatusPayload,
  CreatePlanPayload,
  UpdatePlanPayload,
  UpdateSubscriptionPayload,
  Permission,
  CreatePermissionPayload,
  UpdatePermissionPayload,
  DashboardStats,
  RevenueData,
  GrowthData,
} from "./platform.service";
export type {
  AddToCartPayload,
  UpdateCartItemPayload,
  ApplyCouponPayload,
  CheckoutPayload,
  OrderLookupPayload,
  CustomerRegisterPayload,
  CustomerLoginPayload,
  UpdateCustomerProfilePayload,
  CustomerAddressPayload,
  CustomerAuthResponse,
} from "./storefront.service";
export type { UploadResult } from "./upload.service";
export type {
  StoreSettings,
  GeneralSettings,
  BrandingSettings,
  SeoSettings,
  ContactSettings,
  UpdateGeneralPayload,
  UpdateBrandingPayload,
  UpdateSeoPayload,
  UpdateContactPayload,
} from "./storeSettings.service";
