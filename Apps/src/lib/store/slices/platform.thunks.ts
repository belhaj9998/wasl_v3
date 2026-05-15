import { createAsyncThunk } from "@reduxjs/toolkit";
import { platformService } from "@/lib/api/services/platform.service";
import type {
  CreatePlanPayload,
  UpdatePlanPayload,
  UpdateStoreStatusPayload,
  UpdateSubscriptionPayload,
  UpdateUserPayload,
} from "@/lib/api/services/platform.service";
import type { PaginationParams } from "@/types";

/**
 * Extract error message from API error responses.
 * The apiClient throws the raw JSON response object on failure,
 * which is not an Error instance.
 */
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    if ("message" in error && typeof (error as any).message === "string") {
      return (error as any).message;
    }
    if ("error" in error && typeof (error as any).error === "string") {
      return (error as any).error;
    }
  }
  if (typeof error === "string") return error;
  return fallback;
}

// --- Users ---

export const fetchPlatformUsers = createAsyncThunk(
  "platform/fetchUsers",
  async (params: PaginationParams | undefined, { rejectWithValue }) => {
    try {
      const response = await platformService.users.getAll(params);
      return response;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch users"),
      );
    }
  },
);

export const updatePlatformUser = createAsyncThunk(
  "platform/updateUser",
  async (
    { userId, payload }: { userId: number; payload: UpdateUserPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await platformService.users.update(userId, payload);
      // Backend returns { data: { user: {...} } }
      return (response.data as any).user ?? response.data;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to update user"),
      );
    }
  },
);

export const deletePlatformUser = createAsyncThunk(
  "platform/deleteUser",
  async (userId: number, { rejectWithValue }) => {
    try {
      await platformService.users.delete(userId);
      return userId;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to delete user"),
      );
    }
  },
);

// --- Stores ---

export const fetchPlatformStores = createAsyncThunk(
  "platform/fetchStores",
  async (params: PaginationParams | undefined, { rejectWithValue }) => {
    try {
      const response = await platformService.stores.getAll(params);
      return response;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch stores"),
      );
    }
  },
);

export const updatePlatformStoreStatus = createAsyncThunk(
  "platform/updateStoreStatus",
  async (
    {
      storeId,
      payload,
    }: { storeId: number; payload: UpdateStoreStatusPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await platformService.stores.updateStatus(
        storeId,
        payload,
      );
      // Backend returns { data: { store: {...} } }
      return (response.data as any).store ?? response.data;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to update store status"),
      );
    }
  },
);

export const deletePlatformStore = createAsyncThunk(
  "platform/deleteStore",
  async (storeId: number, { rejectWithValue }) => {
    try {
      await platformService.stores.delete(storeId);
      return storeId;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to delete store"),
      );
    }
  },
);

// --- Plans ---

export const fetchPlatformPlans = createAsyncThunk(
  "platform/fetchPlans",
  async (params: PaginationParams | undefined, { rejectWithValue }) => {
    try {
      const response = await platformService.plans.getAll(params);
      return response;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch plans"),
      );
    }
  },
);

export const createPlatformPlan = createAsyncThunk(
  "platform/createPlan",
  async (payload: CreatePlanPayload, { rejectWithValue }) => {
    try {
      const response = await platformService.plans.create(payload);
      // Backend returns { data: { plan: {...} } }
      return (response.data as any).plan ?? response.data;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to create plan"),
      );
    }
  },
);

export const updatePlatformPlan = createAsyncThunk(
  "platform/updatePlan",
  async (
    { planId, payload }: { planId: number; payload: UpdatePlanPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await platformService.plans.update(planId, payload);
      // Backend returns { data: { plan: {...} } }
      return (response.data as any).plan ?? response.data;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to update plan"),
      );
    }
  },
);

export const deletePlatformPlan = createAsyncThunk(
  "platform/deletePlan",
  async (planId: number, { rejectWithValue }) => {
    try {
      await platformService.plans.delete(planId);
      return planId;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to delete plan"),
      );
    }
  },
);

// --- Subscriptions ---

export const fetchPlatformSubscriptions = createAsyncThunk(
  "platform/fetchSubscriptions",
  async (params: PaginationParams | undefined, { rejectWithValue }) => {
    try {
      const response = await platformService.subscriptions.getAll(params);
      return response;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch subscriptions"),
      );
    }
  },
);

export const updatePlatformSubscription = createAsyncThunk(
  "platform/updateSubscription",
  async (
    {
      subscriptionId,
      payload,
    }: { subscriptionId: number; payload: UpdateSubscriptionPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await platformService.subscriptions.update(
        subscriptionId,
        payload,
      );
      // Backend returns { data: { subscription: {...} } }
      return (response.data as any).subscription ?? response.data;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to update subscription"),
      );
    }
  },
);

// --- Dashboard Stats ---

export const fetchPlatformStats = createAsyncThunk(
  "platform/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformService.dashboard.getStats();
      return response.data.stats;
    } catch (error: unknown) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch platform stats"),
      );
    }
  },
);
