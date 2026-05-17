import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";

/**
 * Base selectors
 */
const selectCouponsState = (state: RootState) => state.coupons;
const selectCouponItems = (state: RootState) => state.coupons.items;

/**
 * Select active coupons (is_active === true and not expired)
 */
export const selectActiveCoupons = createSelector(
  [selectCouponItems],
  (items) => {
    const now = new Date().toISOString();
    return items.filter((c) => c.is_active && (!c.ends_at || c.ends_at > now));
  },
);

/**
 * Select a single coupon by ID
 */
export const selectCouponById = createSelector(
  [selectCouponItems, (_: RootState, couponId: number) => couponId],
  (items, couponId) => items.find((c) => c.id === couponId) ?? null,
);

/**
 * Select coupons loading state
 */
export const selectCouponsLoading = createSelector(
  [selectCouponsState],
  (state) => state.loading,
);

/**
 * Select coupons error
 */
export const selectCouponsError = createSelector(
  [selectCouponsState],
  (state) => state.error,
);

/**
 * Select coupons pagination meta
 */
export const selectCouponsMeta = createSelector(
  [selectCouponsState],
  (state) => state.meta,
);
