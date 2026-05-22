import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";

/**
 * Base selectors
 */
const selectProductsState = (state: RootState) => state.products;
const selectProductItems = (state: RootState) => state.products.items;

/**
 * Select only published products.
 */
export const selectActiveProducts = createSelector(
  [selectProductItems],
  (items) => items.filter((p) => p.status === "PUBLISHED"),
);

/**
 * Select products by category ID
 */
export const selectProductsByCategory = createSelector(
  [selectProductItems, (_: RootState, categoryId: number) => categoryId],
  (items, categoryId) =>
    items.filter((p) => p.categories?.some((c) => c.id === categoryId)),
);

/**
 * Select a single product by ID
 */
export const selectProductById = createSelector(
  [selectProductItems, (_: RootState, productId: number) => productId],
  (items, productId) => items.find((p) => p.id === productId) ?? null,
);

/**
 * Select products loading state
 */
export const selectProductsLoading = createSelector(
  [selectProductsState],
  (state) => state.loading,
);

/**
 * Select products error
 */
export const selectProductsError = createSelector(
  [selectProductsState],
  (state) => state.error,
);

/**
 * Select products pagination meta
 */
export const selectProductsMeta = createSelector(
  [selectProductsState],
  (state) => state.meta,
);
