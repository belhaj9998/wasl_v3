import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";

/**
 * Base selectors
 */
const selectCustomersState = (state: RootState) => state.customers;
const selectCustomerItems = (state: RootState) => state.customers.items;

/**
 * Select a single customer by ID
 */
export const selectCustomerById = createSelector(
  [selectCustomerItems, (_: RootState, customerId: number) => customerId],
  (items, customerId) => items.find((c) => c.id === customerId) ?? null,
);

/**
 * Select total customer count from pagination meta
 */
export const selectCustomerCount = createSelector(
  [selectCustomersState],
  (state) => state.meta?.total ?? state.items.length,
);

/**
 * Select customers loading state
 */
export const selectCustomersLoading = createSelector(
  [selectCustomersState],
  (state) => state.loading,
);

/**
 * Select customers error
 */
export const selectCustomersError = createSelector(
  [selectCustomersState],
  (state) => state.error,
);

/**
 * Select customers pagination meta
 */
export const selectCustomersMeta = createSelector(
  [selectCustomersState],
  (state) => state.meta,
);
