import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import type { OrderStatus } from "@/types";

/**
 * Base selectors
 */
const selectOrdersState = (state: RootState) => state.orders;
const selectOrderItems = (state: RootState) => state.orders.items;

/**
 * Select pending orders (status === 'PENDING')
 */
export const selectPendingOrders = createSelector([selectOrderItems], (items) =>
  items.filter((o) => o.status === "PENDING"),
);

/**
 * Select a single order by ID
 */
export const selectOrderById = createSelector(
  [selectOrderItems, (_: RootState, orderId: number) => orderId],
  (items, orderId) => items.find((o) => o.id === orderId) ?? null,
);

/**
 * Select orders by status
 */
export const selectOrdersByStatus = createSelector(
  [selectOrderItems, (_: RootState, status: OrderStatus) => status],
  (items, status) => items.filter((o) => o.status === status),
);

/**
 * Select orders loading state
 */
export const selectOrdersLoading = createSelector(
  [selectOrdersState],
  (state) => state.loading,
);

/**
 * Select orders error
 */
export const selectOrdersError = createSelector(
  [selectOrdersState],
  (state) => state.error,
);

/**
 * Select orders pagination meta
 */
export const selectOrdersMeta = createSelector(
  [selectOrdersState],
  (state) => state.meta,
);
