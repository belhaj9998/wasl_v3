import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Customer, CustomerStatus, PaginationMeta } from "@/types";
import type { CacheEntry } from "../cache";
import { createCacheEntry } from "../cache";
import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "./customers.thunks";

export interface CustomersState {
  items: Customer[];
  currentCustomer: Customer | null;
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  _rollbackSnapshot: Customer[] | null;
  listCache: CacheEntry<{ data: Customer[]; meta: PaginationMeta }> | null;
}

const initialState: CustomersState = {
  items: [],
  currentCustomer: null,
  meta: null,
  loading: false,
  error: null,
  _rollbackSnapshot: null,
  listCache: null,
};

const customersSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    reset: () => initialState,
    invalidateListCache(state) {
      state.listCache = null;
    },
    optimisticDelete(state, action: PayloadAction<number>) {
      state._rollbackSnapshot = state.items;
      state.items = state.items.filter((c) => c.id !== action.payload);
    },
    optimisticStatusChange(
      state,
      action: PayloadAction<{ id: number; status: CustomerStatus }>,
    ) {
      state._rollbackSnapshot = state.items.map((c) => ({ ...c }));
      const index = state.items.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = {
          ...state.items[index],
          status: action.payload.status,
        };
      }
    },
    rollback(state) {
      if (state._rollbackSnapshot) {
        state.items = state._rollbackSnapshot;
        state._rollbackSnapshot = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCustomers
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.meta = action.payload.meta;
        state.listCache = createCacheEntry(
          { data: action.payload.data, meta: action.payload.meta },
          action.meta.arg.params,
        );
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchCustomerById
      .addCase(fetchCustomerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCustomer = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createCustomer
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateCustomer
      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentCustomer?.id === action.payload.id) {
          state.currentCustomer = action.payload;
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteCustomer
      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((c) => c.id !== action.payload);
        if (state.currentCustomer?.id === action.payload) {
          state.currentCustomer = null;
        }
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  reset: resetCustomers,
  invalidateListCache: invalidateCustomersListCache,
  optimisticDelete: optimisticDeleteCustomer,
  optimisticStatusChange: optimisticCustomerStatusChange,
  rollback: rollbackCustomers,
} = customersSlice.actions;
export default customersSlice.reducer;
