import { createSlice } from "@reduxjs/toolkit";
import type { InventoryMovement, PaginationMeta } from "@/types";
import type { InventoryItem } from "@/lib/api/services/inventory.service";
import {
  fetchInventory,
  fetchLowStock,
  fetchInventoryMovements,
  adjustInventory,
} from "./inventory.thunks";

export interface InventoryState {
  items: InventoryItem[];
  movements: InventoryMovement[];
  lowStock: InventoryItem[];
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  items: [],
  movements: [],
  lowStock: [],
  meta: null,
  loading: false,
  error: null,
};

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchInventory
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.meta = action.payload.meta;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchLowStock
      .addCase(fetchLowStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLowStock.fulfilled, (state, action) => {
        state.loading = false;
        state.lowStock = action.payload.data;
      })
      .addCase(fetchLowStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchInventoryMovements
      .addCase(fetchInventoryMovements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryMovements.fulfilled, (state, action) => {
        state.loading = false;
        state.movements = action.payload.data;
      })
      .addCase(fetchInventoryMovements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // adjustInventory
      .addCase(adjustInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adjustInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.movements.unshift(action.payload);
      })
      .addCase(adjustInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { reset: resetInventory } = inventorySlice.actions;
export default inventorySlice.reducer;
