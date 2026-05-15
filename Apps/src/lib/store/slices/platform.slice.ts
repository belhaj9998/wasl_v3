import { createSlice } from "@reduxjs/toolkit";
import type { PaginationMeta, Plan, Store, Subscription, User } from "@/types";
import type { DashboardStats } from "@/lib/api/services/platform.service";
import {
  fetchPlatformUsers,
  updatePlatformUser,
  deletePlatformUser,
  fetchPlatformStores,
  updatePlatformStoreStatus,
  deletePlatformStore,
  fetchPlatformPlans,
  createPlatformPlan,
  updatePlatformPlan,
  deletePlatformPlan,
  fetchPlatformSubscriptions,
  updatePlatformSubscription,
  fetchPlatformStats,
} from "./platform.thunks";

export interface PlatformState {
  users: {
    items: User[];
    meta: PaginationMeta | null;
    loading: boolean;
    error: string | null;
  };
  stores: {
    items: Store[];
    meta: PaginationMeta | null;
    loading: boolean;
    error: string | null;
  };
  plans: { items: Plan[]; loading: boolean; error: string | null };
  subscriptions: {
    items: Subscription[];
    meta: PaginationMeta | null;
    loading: boolean;
    error: string | null;
  };
  stats: DashboardStats | null;
  statsLoading: boolean;
  statsError: string | null;
}

const initialState: PlatformState = {
  users: { items: [], meta: null, loading: false, error: null },
  stores: { items: [], meta: null, loading: false, error: null },
  plans: { items: [], loading: false, error: null },
  subscriptions: { items: [], meta: null, loading: false, error: null },
  stats: null,
  statsLoading: false,
  statsError: null,
};

const platformSlice = createSlice({
  name: "platform",
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // --- Users ---
      .addCase(fetchPlatformUsers.pending, (state) => {
        state.users.loading = true;
        state.users.error = null;
      })
      .addCase(fetchPlatformUsers.fulfilled, (state, action) => {
        state.users.loading = false;
        state.users.items = action.payload.data;
        state.users.meta = action.payload.meta;
      })
      .addCase(fetchPlatformUsers.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload as string;
      })
      .addCase(updatePlatformUser.fulfilled, (state, action) => {
        const index = state.users.items.findIndex(
          (u) => u.id === action.payload.id,
        );
        if (index !== -1) {
          state.users.items[index] = action.payload;
        }
      })
      .addCase(deletePlatformUser.fulfilled, (state, action) => {
        state.users.items = state.users.items.filter(
          (u) => u.id !== action.payload,
        );
      })
      // --- Stores ---
      .addCase(fetchPlatformStores.pending, (state) => {
        state.stores.loading = true;
        state.stores.error = null;
      })
      .addCase(fetchPlatformStores.fulfilled, (state, action) => {
        state.stores.loading = false;
        state.stores.items = action.payload.data;
        state.stores.meta = action.payload.meta;
      })
      .addCase(fetchPlatformStores.rejected, (state, action) => {
        state.stores.loading = false;
        state.stores.error = action.payload as string;
      })
      .addCase(updatePlatformStoreStatus.fulfilled, (state, action) => {
        const index = state.stores.items.findIndex(
          (s) => s.id === action.payload.id,
        );
        if (index !== -1) {
          state.stores.items[index] = action.payload;
        }
      })
      .addCase(deletePlatformStore.fulfilled, (state, action) => {
        state.stores.items = state.stores.items.filter(
          (s) => s.id !== action.payload,
        );
      })
      // --- Plans ---
      .addCase(fetchPlatformPlans.pending, (state) => {
        state.plans.loading = true;
        state.plans.error = null;
      })
      .addCase(fetchPlatformPlans.fulfilled, (state, action) => {
        state.plans.loading = false;
        state.plans.items = action.payload.data;
      })
      .addCase(fetchPlatformPlans.rejected, (state, action) => {
        state.plans.loading = false;
        state.plans.error = action.payload as string;
      })
      .addCase(createPlatformPlan.fulfilled, (state, action) => {
        state.plans.items.push(action.payload);
      })
      .addCase(updatePlatformPlan.fulfilled, (state, action) => {
        const index = state.plans.items.findIndex(
          (p) => p.id === action.payload.id,
        );
        if (index !== -1) {
          state.plans.items[index] = action.payload;
        }
      })
      .addCase(deletePlatformPlan.fulfilled, (state, action) => {
        state.plans.items = state.plans.items.filter(
          (p) => p.id !== action.payload,
        );
      })
      // --- Subscriptions ---
      .addCase(fetchPlatformSubscriptions.pending, (state) => {
        state.subscriptions.loading = true;
        state.subscriptions.error = null;
      })
      .addCase(fetchPlatformSubscriptions.fulfilled, (state, action) => {
        state.subscriptions.loading = false;
        state.subscriptions.items = action.payload.data;
        state.subscriptions.meta = action.payload.meta;
      })
      .addCase(fetchPlatformSubscriptions.rejected, (state, action) => {
        state.subscriptions.loading = false;
        state.subscriptions.error = action.payload as string;
      })
      .addCase(updatePlatformSubscription.fulfilled, (state, action) => {
        const index = state.subscriptions.items.findIndex(
          (s) => s.id === action.payload.id,
        );
        if (index !== -1) {
          state.subscriptions.items[index] = action.payload;
        }
      })
      // --- Stats ---
      .addCase(fetchPlatformStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchPlatformStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchPlatformStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError =
          (action.payload as string) || "Failed to fetch platform stats";
      });
  },
});

export const { reset: resetPlatform } = platformSlice.actions;
export default platformSlice.reducer;
