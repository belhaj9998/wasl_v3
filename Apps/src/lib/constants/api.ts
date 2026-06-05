/**
 * API Constants
 * Base URL and endpoint definitions for all API communication
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6200/api";

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    CHANGE_PASSWORD: "/auth/change-password",
    CREATE_STORE: "/auth/stores",
  },

  // Platform Admin
  PLATFORM: {
    USERS: "/platform/users",
    STORES: "/platform/stores",
    PLANS: "/platform/plans",
    SUBSCRIPTIONS: "/platform/subscriptions",
    DASHBOARD: {
      STATS: "/platform/dashboard/stats",
      REVENUE: "/platform/dashboard/revenue",
      GROWTH: "/platform/dashboard/growth",
    },
  },

  // Store Admin (requires storeId in path)
  STORE: {
    PRODUCTS: (storeId: number) => `/stores/${storeId}/products`,
    CATEGORIES: (storeId: number) => `/stores/${storeId}/categories`,
    ORDERS: (storeId: number) => `/stores/${storeId}/orders`,
    CUSTOMERS: (storeId: number) => `/stores/${storeId}/customers`,
    COUPONS: (storeId: number) => `/stores/${storeId}/coupons`,
    INVENTORY: (storeId: number) => `/stores/${storeId}/inventory`,
    MEMBERS: (storeId: number) => `/stores/${storeId}/members`,
    ROLES: (storeId: number) => `/stores/${storeId}/roles`,
    SETTINGS: (storeId: number) => `/stores/${storeId}/settings`,
    MEMBERSHIPS: (storeId: number) => `/stores/${storeId}/memberships`,
    DASHBOARD: (storeId: number) => `/stores/${storeId}/dashboard`,
    NOTIFICATIONS: (storeId: number) => `/stores/${storeId}/notifications`,
    NOTIFICATIONS_READ: (storeId: number) =>
      `/stores/${storeId}/notifications/read`,
    NOTIFICATIONS_READ_ALL: (storeId: number) =>
      `/stores/${storeId}/notifications/read-all`,
    NOTIFICATIONS_SETTINGS: (storeId: number) =>
      `/stores/${storeId}/notifications/settings`,
    ORDER_TAGS: (storeId: number) => `/stores/${storeId}/order-tags`,
    ORDER_TAG_BY_ID: (storeId: number, tagId: number) =>
      `/stores/${storeId}/order-tags/${tagId}`,
    ORDER_TAGS_FOR_ORDER: (storeId: number, orderId: number) =>
      `/stores/${storeId}/orders/${orderId}/tags`,
    ORDER_TAGS_BULK: (storeId: number) => `/stores/${storeId}/orders/bulk/tags`,
    ORDER_ASSIGNEES: (storeId: number) => `/stores/${storeId}/orders/assignees`,
    ORDER_ASSIGNEE: (storeId: number, orderId: number) =>
      `/stores/${storeId}/orders/${orderId}/assignee`,
    ORDER_SOURCE: (storeId: number, orderId: number) =>
      `/stores/${storeId}/orders/${orderId}/source`,
  },

  // Storefront (requires domain in path)
  STOREFRONT: {
    STORE_INFO: (domain: string) => `/storefront/${domain}`,
    PRODUCTS: (domain: string) => `/storefront/${domain}/products`,
    CATEGORIES: (domain: string) => `/storefront/${domain}/categories`,
    CART: (domain: string) => `/storefront/${domain}/cart`,
    CART_ITEMS: (domain: string) => `/storefront/${domain}/cart/items`,
    CHECKOUT: (domain: string) => `/storefront/${domain}/checkout`,
    CUSTOMERS: {
      LOGIN: (domain: string) => `/storefront/${domain}/customers/login`,
      REGISTER: (domain: string) => `/storefront/${domain}/customers/register`,
      ME: (domain: string) => `/storefront/${domain}/customers/me`,
      ORDERS: (domain: string) => `/storefront/${domain}/customers/me/orders`,
      ADDRESSES: (domain: string) =>
        `/storefront/${domain}/customers/me/addresses`,
    },
    ORDER_LOOKUP: (domain: string) => `/storefront/${domain}/orders/lookup`,
    COUPON_APPLY: (domain: string) => `/storefront/${domain}/cart/apply-coupon`,
    COUPON_REMOVE: (domain: string) => `/storefront/${domain}/cart/coupon`,
  },

  UPLOAD: {
    IMAGE: "/upload/image",
    FILE: "/upload/file",
    DELETE: (key: string) =>
      `/upload/${key.split("/").map(encodeURIComponent).join("/")}`,
  },
} as const;
