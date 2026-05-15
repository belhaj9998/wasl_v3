/**
 * Auth Thunks
 * Async thunks for authentication, profile, and store context management.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.9, 1.10, 1.11, 6.1, 6.2, 6.6, 6.7, 27.2, 27.3
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "@/lib/api/services";
import { apiClient, setAccessToken } from "@/lib/api/client";
import { API_ENDPOINTS, STORAGE_KEYS } from "@/lib/constants";
import type { LoginPayload, RegisterPayload, User, ApiResponse } from "@/types";
import { resetProducts } from "./products.slice";
import { resetOrders } from "./orders.slice";
import { resetCategories } from "./categories.slice";
import { resetCustomers } from "./customers.slice";
import { resetCoupons } from "./coupons.slice";
import { resetInventory } from "./inventory.slice";
import { resetMembers } from "./members.slice";

// ---------------------------------------------------------------------------
// Login Thunk
// ---------------------------------------------------------------------------

export const loginThunk = createAsyncThunk<User, LoginPayload>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await authService.login(payload);
      setAccessToken(response.data.accessToken);
      return response.data.user;
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message || "Login failed");
    }
  },
);

// ---------------------------------------------------------------------------
// Register Thunk
// ---------------------------------------------------------------------------

export const registerThunk = createAsyncThunk<User, RegisterPayload>(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await authService.register(payload);
      setAccessToken(response.data.accessToken);
      return response.data.user;
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message || "Registration failed");
    }
  },
);

// ---------------------------------------------------------------------------
// Logout Thunk
// ---------------------------------------------------------------------------

export const logoutThunk = createAsyncThunk<void, void>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      // Clear persisted store ID on logout
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_STORE_ID);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message || "Logout failed");
    }
  },
);

// ---------------------------------------------------------------------------
// Fetch Profile Thunk
// ---------------------------------------------------------------------------

export const fetchProfileThunk = createAsyncThunk<User, void>(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getProfile();
      return response.data;
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message || "Failed to fetch profile");
    }
  },
);

// ---------------------------------------------------------------------------
// Set Current Store Thunk
// ---------------------------------------------------------------------------

interface SetCurrentStorePayload {
  storeId: number;
}

interface SetCurrentStoreResult {
  storeId: number;
  permissions: string[];
}

export const setCurrentStoreThunk = createAsyncThunk<
  SetCurrentStoreResult,
  SetCurrentStorePayload
>(
  "auth/setCurrentStore",
  async ({ storeId }, { dispatch, rejectWithValue }) => {
    try {
      // Reset all store-scoped slices before switching context
      dispatch(resetProducts());
      dispatch(resetOrders());
      dispatch(resetCategories());
      dispatch(resetCustomers());
      dispatch(resetCoupons());
      dispatch(resetInventory());
      dispatch(resetMembers());

      // Fetch the user's membership/permissions for this store
      const response = await apiClient<ApiResponse<{ permissions: string[] }>>(
        API_ENDPOINTS.STORE.MEMBERSHIPS(storeId),
        { storeId },
      );

      const permissions = response.data.permissions;

      // Persist store ID to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.CURRENT_STORE_ID, String(storeId));
      }

      return { storeId, permissions };
    } catch (error: unknown) {
      // Clear persisted store ID on failure
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_STORE_ID);
      }
      const err = error as { message?: string };
      return rejectWithValue(err.message || "Failed to load store permissions");
    }
  },
);
