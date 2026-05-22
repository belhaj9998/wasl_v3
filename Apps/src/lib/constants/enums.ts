/**
 * Application Enums and State Machines
 * Status enums, transition maps, and labels for orders, stores, and products
 */

// ─── Order Status ────────────────────────────────────────────────────────────

export const ORDER_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  PREPARING: "PREPARING",
  SHIPPED: "SHIPPED",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELED: "CANCELED",
  RETURNED: "RETURNED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// ─── Payment Status ──────────────────────────────────────────────────────────

export const PAYMENT_STATUS = {
  UNPAID: "UNPAID",
  PENDING: "PENDING",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// ─── Product Status ──────────────────────────────────────────────────────────

export const PRODUCT_STATUS = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ProductStatus =
  (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

// ─── Store Status ────────────────────────────────────────────────────────────

export const STORE_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;

export type StoreStatus = (typeof STORE_STATUS)[keyof typeof STORE_STATUS];

// ─── Order Status Transitions (State Machine) ────────────────────────────────
// Defines valid next statuses from each current status.
// Terminal states (CANCELED, RETURNED) have no outgoing transitions.

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.DRAFT]: [ORDER_STATUS.PENDING, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.RETURNED],
  [ORDER_STATUS.IN_TRANSIT]: [
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.RETURNED,
  ],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.RETURNED,
  ],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.RETURNED],
  [ORDER_STATUS.CANCELED]: [],
  [ORDER_STATUS.RETURNED]: [],
};

// ─── Store Status Transitions (State Machine) ────────────────────────────────
// DRAFT → ACTIVE
// ACTIVE → SUSPENDED, ARCHIVED
// SUSPENDED → ACTIVE, ARCHIVED
// ARCHIVED → (terminal)

export const STORE_STATUS_TRANSITIONS: Record<StoreStatus, StoreStatus[]> = {
  [STORE_STATUS.DRAFT]: [STORE_STATUS.ACTIVE],
  [STORE_STATUS.ACTIVE]: [STORE_STATUS.SUSPENDED, STORE_STATUS.ARCHIVED],
  [STORE_STATUS.SUSPENDED]: [STORE_STATUS.ACTIVE, STORE_STATUS.ARCHIVED],
  [STORE_STATUS.ARCHIVED]: [],
};

// ─── Order Status Labels (Arabic + English) ──────────────────────────────────

export const ORDER_STATUS_LABELS: Record<
  OrderStatus,
  { ar: string; en: string }
> = {
  [ORDER_STATUS.DRAFT]: { ar: "مسودة", en: "Draft" },
  [ORDER_STATUS.PENDING]: { ar: "قيد الانتظار", en: "Pending" },
  [ORDER_STATUS.CONFIRMED]: { ar: "مؤكد", en: "Confirmed" },
  [ORDER_STATUS.PROCESSING]: { ar: "قيد المعالجة", en: "Processing" },
  [ORDER_STATUS.PREPARING]: { ar: "قيد التحضير", en: "Preparing" },
  [ORDER_STATUS.SHIPPED]: { ar: "تم الشحن", en: "Shipped" },
  [ORDER_STATUS.IN_TRANSIT]: { ar: "في الطريق", en: "In Transit" },
  [ORDER_STATUS.OUT_FOR_DELIVERY]: {
    ar: "خارج للتوصيل",
    en: "Out for Delivery",
  },
  [ORDER_STATUS.DELIVERED]: { ar: "تم التوصيل", en: "Delivered" },
  [ORDER_STATUS.CANCELED]: { ar: "ملغي", en: "Canceled" },
  [ORDER_STATUS.RETURNED]: { ar: "مرتجع", en: "Returned" },
};

// ─── Payment Status Labels ───────────────────────────────────────────────────

export const PAYMENT_STATUS_LABELS: Record<
  PaymentStatus,
  { ar: string; en: string }
> = {
  [PAYMENT_STATUS.UNPAID]: { ar: "غير مدفوع", en: "Unpaid" },
  [PAYMENT_STATUS.PENDING]: { ar: "قيد الانتظار", en: "Pending" },
  [PAYMENT_STATUS.PARTIALLY_PAID]: { ar: "مدفوع جزئياً", en: "Partially Paid" },
  [PAYMENT_STATUS.PAID]: { ar: "مدفوع", en: "Paid" },
  [PAYMENT_STATUS.FAILED]: { ar: "فشل الدفع", en: "Failed" },
  [PAYMENT_STATUS.REFUNDED]: { ar: "مسترد", en: "Refunded" },
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: {
    ar: "مسترد جزئياً",
    en: "Partially Refunded",
  },
};

// ─── Product Status Labels ───────────────────────────────────────────────────

export const PRODUCT_STATUS_LABELS: Record<
  ProductStatus,
  { ar: string; en: string }
> = {
  [PRODUCT_STATUS.DRAFT]: { ar: "مسودة", en: "Draft" },
  [PRODUCT_STATUS.PENDING_REVIEW]: {
    ar: "بانتظار المراجعة",
    en: "Pending Review",
  },
  [PRODUCT_STATUS.PUBLISHED]: { ar: "منشور", en: "Published" },
  [PRODUCT_STATUS.ARCHIVED]: { ar: "محذوف", en: "Removed" },
};

// ─── Store Status Labels ─────────────────────────────────────────────────────

export const STORE_STATUS_LABELS: Record<
  StoreStatus,
  { ar: string; en: string }
> = {
  [STORE_STATUS.DRAFT]: { ar: "مسودة", en: "Draft" },
  [STORE_STATUS.ACTIVE]: { ar: "نشط", en: "Active" },
  [STORE_STATUS.SUSPENDED]: { ar: "معلق", en: "Suspended" },
  [STORE_STATUS.ARCHIVED]: { ar: "مؤرشف", en: "Archived" },
};
