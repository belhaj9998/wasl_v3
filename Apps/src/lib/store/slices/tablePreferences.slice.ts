/**
 * Table Preferences slice
 *
 * Owns user-tunable, per-table column preferences (visibility + order). Scoped
 * to the orders table only in this iteration. Persisted to localStorage via
 * redux-persist (see store.ts for the persist config).
 *
 * State shape:
 *   { orders: { visibility: Record<string, boolean>; order: string[] } | undefined }
 *
 * Storing `orders` as `undefined` (rather than always-defined) makes "no saved
 * state" a first-class case and lets `resetOrders` be a single-line clear.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export interface OrdersColumnPreferences {
  visibility: Record<string, boolean>;
  order: string[];
}

export interface TablePreferencesState {
  orders: OrdersColumnPreferences | undefined;
}

const initialState: TablePreferencesState = {
  orders: undefined,
};

const tablePreferencesSlice = createSlice({
  name: "tablePreferences",
  initialState,
  reducers: {
    /**
     * Replaces orders.visibility while preserving the existing order array.
     */
    setOrdersVisibility(state, action: PayloadAction<Record<string, boolean>>) {
      state.orders = {
        visibility: action.payload,
        order: state.orders?.order ?? [],
      };
    },

    /**
     * Replaces orders.order while preserving the existing visibility record.
     */
    setOrdersOrder(state, action: PayloadAction<string[]>) {
      state.orders = {
        visibility: state.orders?.visibility ?? {},
        order: action.payload,
      };
    },

    /**
     * Clears orders preferences entirely (back to "no saved state").
     * Consumers fall back to default visibility/order.
     */
    resetOrders(state) {
      state.orders = undefined;
    },
  },
});

export const { setOrdersVisibility, setOrdersOrder, resetOrders } =
  tablePreferencesSlice.actions;

// Selectors
export const selectOrdersPreferences = (
  state: RootState,
): OrdersColumnPreferences | undefined => state.tablePreferences.orders;

export const selectOrdersVisibility = (
  state: RootState,
): Record<string, boolean> | undefined =>
  state.tablePreferences.orders?.visibility;

export const selectOrdersOrder = (state: RootState): string[] | undefined =>
  state.tablePreferences.orders?.order;

export default tablePreferencesSlice.reducer;
