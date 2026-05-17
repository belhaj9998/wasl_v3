/**
 * Memoized Selectors — Barrel Export
 *
 * All selectors use createSelector from Redux Toolkit for memoization.
 * Derived values are only recomputed when their input selectors change.
 */

export {
  selectActiveProducts,
  selectProductsByCategory,
  selectProductById,
  selectProductsLoading,
  selectProductsError,
  selectProductsMeta,
} from "./products.selectors";

export {
  selectPendingOrders,
  selectOrderById,
  selectOrdersByStatus,
  selectOrdersLoading,
  selectOrdersError,
  selectOrdersMeta,
} from "./orders.selectors";

export {
  selectRootCategories,
  selectCategoryById,
  selectCategoriesLoading,
  selectCategoriesError,
} from "./categories.selectors";

export {
  selectCustomerById,
  selectCustomerCount,
  selectCustomersLoading,
  selectCustomersError,
  selectCustomersMeta,
} from "./customers.selectors";

export {
  selectActiveCoupons,
  selectCouponById,
  selectCouponsLoading,
  selectCouponsError,
  selectCouponsMeta,
} from "./coupons.selectors";

export {
  selectLowStockItems,
  selectInventoryLoading,
  selectInventoryError,
  selectInventoryMovements,
  selectInventoryMeta,
} from "./inventory.selectors";
