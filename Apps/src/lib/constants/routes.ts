/**
 * Application Routes
 * All navigation paths for the three interfaces
 */

export const ROUTES = {
  // Auth routes
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    FORGOT_PASSWORD: "/forgot-password",
    RESET_PASSWORD: "/reset-password",
  },

  // Platform Admin routes
  PLATFORM: {
    DASHBOARD: "/platform/dashboard",
    USERS: "/platform/users",
    STORES: "/platform/stores",
    PLANS: "/platform/plans",
    SUBSCRIPTIONS: "/platform/subscriptions",
    PERMISSIONS: "/platform/permissions",
  },

  // Store Admin routes
  STORE_ADMIN: {
    DASHBOARD: "/admin/dashboard",
    STORE_SELECT: "/admin/stores",
    PRODUCTS: "/admin/products",
    PRODUCT_CREATE: "/admin/products/create",
    PRODUCT_EDIT: (id: number) => `/admin/products/${id}/edit`,
    PRODUCT_VARIANTS: (id: number) => `/admin/products/${id}/variants`,
    PRODUCT_DETAIL: (id: number) => `/admin/products/${id}`,
    CATEGORIES: "/admin/categories",
    ORDERS: "/admin/orders",
    ORDER_CREATE: "/admin/orders/create",
    ORDER_DETAIL: (id: number) => `/admin/orders/${id}`,
    CUSTOMERS: "/admin/customers",
    CUSTOMER_DETAIL: (id: number) => `/admin/customers/${id}`,
    COUPONS: "/admin/coupons",
    COUPON_CREATE: "/admin/coupons/create",
    COUPON_DETAIL: (id: number) => `/admin/coupons/${id}`,
    INVENTORY: "/admin/inventory",
    INVENTORY_LOW_STOCK: "/admin/inventory/low-stock",
    MEMBERS: "/admin/members",
    ROLES: "/admin/roles",
    SETTINGS: "/admin/settings",
  },

  // Storefront routes (dynamic domain)
  STOREFRONT: {
    HOME: (domain: string) => `/${domain}`,
    PRODUCTS: (domain: string) => `/${domain}/products`,
    PRODUCT_DETAIL: (domain: string, slug: string) =>
      `/${domain}/products/${slug}`,
    CATEGORY: (domain: string, slug: string) => `/${domain}/categories/${slug}`,
    CART: (domain: string) => `/${domain}/cart`,
    CHECKOUT: (domain: string) => `/${domain}/checkout`,
    ORDER_CONFIRMATION: (domain: string, orderNumber: string) =>
      `/${domain}/orders/${orderNumber}/confirmation`,
    ORDER_LOOKUP: (domain: string) => `/${domain}/orders/lookup`,
    ACCOUNT: {
      LOGIN: (domain: string) => `/${domain}/account/login`,
      REGISTER: (domain: string) => `/${domain}/account/register`,
      PROFILE: (domain: string) => `/${domain}/account`,
      ORDERS: (domain: string) => `/${domain}/account/orders`,
      ADDRESSES: (domain: string) => `/${domain}/account/addresses`,
    },
  },
} as const;
