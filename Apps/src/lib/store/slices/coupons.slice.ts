import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Coupon, PaginationMeta } from "@/types";
import type { CacheEntry } from "../cache";
import { createCacheEntry } from "../cache";
import {
  fetchCoupons,
  fetchCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "./coupons.thunks";

export interface CouponsState {
  items: Coupon[];
  currentCoupon: Coupon | null;
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  _rollbackSnapshot: Coupon[] | null;
  listCache: CacheEntry<{ data: Coupon[]; meta: PaginationMeta }> | null;
}

const initialState: CouponsState = {
  items: [],
  currentCoupon: null,
  meta: null,
  loading: false,
  error: null,
  _rollbackSnapshot: null,
  listCache: null,
};

const couponsSlice = createSlice({
  name: "coupons",
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
      action: PayloadAction<{ id: number; is_active: boolean }>,
    ) {
      state._rollbackSnapshot = state.items.map((c) => ({ ...c }));
      const index = state.items.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = {
          ...state.items[index],
          is_active: action.payload.is_active,
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
      // fetchCoupons
      .addCase(fetchCoupons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.meta = action.payload.meta;
        state.listCache = createCacheEntry(
          { data: action.payload.data, meta: action.payload.meta },
          action.meta.arg.params,
        );
      })
      .addCase(fetchCoupons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchCouponById
      .addCase(fetchCouponById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCouponById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCoupon = action.payload;
      })
      .addCase(fetchCouponById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createCoupon
      .addCase(createCoupon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCoupon.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createCoupon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateCoupon
      .addCase(updateCoupon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCoupon.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentCoupon?.id === action.payload.id) {
          state.currentCoupon = action.payload;
        }
      })
      .addCase(updateCoupon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteCoupon
      .addCase(deleteCoupon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCoupon.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((c) => c.id !== action.payload);
        if (state.currentCoupon?.id === action.payload) {
          state.currentCoupon = null;
        }
      })
      .addCase(deleteCoupon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  reset: resetCoupons,
  invalidateListCache: invalidateCouponsListCache,
  optimisticDelete: optimisticDeleteCoupon,
  optimisticStatusChange: optimisticCouponStatusChange,
  rollback: rollbackCoupons,
} = couponsSlice.actions;
export default couponsSlice.reducer;
