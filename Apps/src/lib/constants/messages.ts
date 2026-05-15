/**
 * Localized Message Keys
 * Error and success message constants for use with next-intl translations.
 * Keys map to translation files; values are the i18n key paths.
 */

export const ERROR_MESSAGES = {
  // Network & Connection
  NETWORK_ERROR: "errors.network",
  CONNECTION_LOST: "errors.connectionLost",
  CONNECTION_RESTORED: "errors.connectionRestored",
  REQUEST_TIMEOUT: "errors.requestTimeout",

  // Authentication
  INVALID_CREDENTIALS: "errors.auth.invalidCredentials",
  SESSION_EXPIRED: "errors.auth.sessionExpired",
  UNAUTHORIZED: "errors.auth.unauthorized",
  FORBIDDEN: "errors.auth.forbidden",
  RATE_LIMITED: "errors.auth.rateLimited",

  // Validation
  VALIDATION_FAILED: "errors.validation.failed",
  REQUIRED_FIELD: "errors.validation.required",
  INVALID_EMAIL: "errors.validation.invalidEmail",
  INVALID_PHONE: "errors.validation.invalidPhone",
  PASSWORD_TOO_SHORT: "errors.validation.passwordTooShort",
  FIELD_TOO_LONG: "errors.validation.fieldTooLong",
  FIELD_TOO_SHORT: "errors.validation.fieldTooShort",

  // Resources
  NOT_FOUND: "errors.resource.notFound",
  CONFLICT: "errors.resource.conflict",
  ALREADY_EXISTS: "errors.resource.alreadyExists",

  // Store
  STORE_NOT_FOUND: "errors.store.notFound",
  STORE_UNAVAILABLE: "errors.store.unavailable",
  STORE_SELECTION_REQUIRED: "errors.store.selectionRequired",
  INVALID_STATUS_TRANSITION: "errors.store.invalidTransition",

  // Orders
  ORDER_INVALID_TRANSITION: "errors.order.invalidTransition",
  ORDER_INSUFFICIENT_INVENTORY: "errors.order.insufficientInventory",

  // Products
  PRODUCT_INVALID_TRANSITION: "errors.product.invalidTransition",
  PRODUCT_UPLOAD_FAILED: "errors.product.uploadFailed",

  // Inventory
  INSUFFICIENT_STOCK: "errors.inventory.insufficientStock",

  // Cart
  CART_OPERATION_FAILED: "errors.cart.operationFailed",
  CART_ITEM_OUT_OF_STOCK: "errors.cart.itemOutOfStock",

  // Coupons
  COUPON_INVALID: "errors.coupon.invalid",
  COUPON_EXPIRED: "errors.coupon.expired",
  COUPON_USAGE_EXCEEDED: "errors.coupon.usageExceeded",
  COUPON_MINIMUM_NOT_MET: "errors.coupon.minimumNotMet",
  COUPON_HAS_USAGE: "errors.coupon.hasUsage",

  // Members
  MEMBER_ALREADY_EXISTS: "errors.member.alreadyExists",
  MEMBER_NOT_REGISTERED: "errors.member.notRegistered",
  SELF_MODIFICATION: "errors.member.selfModification",

  // Plans
  PLAN_CODE_EXISTS: "errors.plan.codeExists",
  PLAN_IN_USE: "errors.plan.inUse",
} as const;

export const SUCCESS_MESSAGES = {
  // Auth
  LOGIN_SUCCESS: "success.auth.login",
  REGISTER_SUCCESS: "success.auth.register",
  LOGOUT_SUCCESS: "success.auth.logout",
  PASSWORD_RESET_SENT: "success.auth.passwordResetSent",
  PASSWORD_RESET_SUCCESS: "success.auth.passwordReset",

  // CRUD Operations
  CREATED: "success.crud.created",
  UPDATED: "success.crud.updated",
  DELETED: "success.crud.deleted",

  // Store
  STORE_STATUS_CHANGED: "success.store.statusChanged",
  STORE_SETTINGS_UPDATED: "success.store.settingsUpdated",

  // Orders
  ORDER_STATUS_CHANGED: "success.order.statusChanged",
  ORDER_CREATED: "success.order.created",
  ORDER_NOTE_ADDED: "success.order.noteAdded",

  // Products
  PRODUCT_CREATED: "success.product.created",
  PRODUCT_UPDATED: "success.product.updated",
  PRODUCT_DUPLICATED: "success.product.duplicated",
  PRODUCT_STATUS_CHANGED: "success.product.statusChanged",
  MEDIA_UPLOADED: "success.product.mediaUploaded",

  // Categories
  CATEGORY_REORDERED: "success.category.reordered",

  // Inventory
  INVENTORY_ADJUSTED: "success.inventory.adjusted",

  // Cart
  ITEM_ADDED_TO_CART: "success.cart.itemAdded",
  ITEM_REMOVED_FROM_CART: "success.cart.itemRemoved",
  COUPON_APPLIED: "success.cart.couponApplied",
  COUPON_REMOVED: "success.cart.couponRemoved",

  // Checkout
  ORDER_PLACED: "success.checkout.orderPlaced",

  // Members
  MEMBER_INVITED: "success.member.invited",
  MEMBER_ROLE_CHANGED: "success.member.roleChanged",
  MEMBER_REMOVED: "success.member.removed",

  // Roles
  ROLE_CREATED: "success.role.created",
  ROLE_UPDATED: "success.role.updated",
  ROLE_PERMISSIONS_UPDATED: "success.role.permissionsUpdated",

  // Plans
  PLAN_CREATED: "success.plan.created",
  PLAN_UPDATED: "success.plan.updated",

  // Customers
  CUSTOMER_CREATED: "success.customer.created",
  CUSTOMER_UPDATED: "success.customer.updated",
  ADDRESS_SAVED: "success.customer.addressSaved",
} as const;

export type ErrorMessageKey =
  (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];
export type SuccessMessageKey =
  (typeof SUCCESS_MESSAGES)[keyof typeof SUCCESS_MESSAGES];
