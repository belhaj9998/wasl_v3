import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";

/**
 * Base selectors
 */
const selectInventoryState = (state: RootState) => state.inventory;
const selectInventoryItems = (state: RootState) => state.inventory.items;
const selectLowStockItems_ = (state: RootState) => state.inventory.lowStock;

/**
 * Select low stock items (available_quantity <= low_stock_threshold)
 * Uses the dedicated lowStock array if populated, otherwise filters from items
 */
export const selectLowStockItems = createSelector(
  [selectLowStockItems_, selectInventoryItems],
  (lowStock, items) => {
    if (lowStock.length > 0) return lowStock;
    return items.filter(
      (item) => item.available_quantity <= item.low_stock_threshold,
    );
  },
);

/**
 * Select inventory loading state
 */
export const selectInventoryLoading = createSelector(
  [selectInventoryState],
  (state) => state.loading,
);

/**
 * Select inventory error
 */
export const selectInventoryError = createSelector(
  [selectInventoryState],
  (state) => state.error,
);

/**
 * Select inventory movements
 */
export const selectInventoryMovements = createSelector(
  [selectInventoryState],
  (state) => state.movements,
);

/**
 * Select inventory pagination meta
 */
export const selectInventoryMeta = createSelector(
  [selectInventoryState],
  (state) => state.meta,
);
