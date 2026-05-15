/**
 * Auth Slice
 * Manages authentication state, user profile, permissions, and store context.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.9, 1.10, 1.11, 6.1, 6.2, 6.6, 6.7, 27.2, 27.3
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types/auth.types";
import { STORAGE_KEYS } from "@/lib/constants/storage";
import {
  loginThunk,
  registerThunk,
  logoutThunk,
  fetchProfileThunk,
  setCurrentStoreThunk,
} from "./auth.thunks";

// ---------------------------------------------------------------------------
// State Interface
// ---------------------------------------------------------------------------

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  permissions: string[];
  currentStoreId: number | null;
}

// ---------------------------------------------------------------------------
// Initial State (with localStorage persistence for currentStoreId)
// ---------------------------------------------------------------------------

function getPersistedStoreId(): number | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_STORE_ID);
  if (!stored) return null;
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? null : parsed;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  permissions: [],
  currentStoreId: getPersistedStoreId(),
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Directly set current store and permissions (used for synchronous updates) */
    setCurrentStore(
      state,
      action: PayloadAction<{ storeId: number; permissions: string[] }>,
    ) {
      state.currentStoreId = action.payload.storeId;
      state.permissions = action.payload.permissions;
    },

    /** Clear auth error */
    clearAuthError(state) {
      state.error = null;
    },

    /** Reset auth state to initial values (used on session expiry) */
    resetAuth() {
      return {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        permissions: [],
        currentStoreId: null,
      };
    },
  },
  extraReducers: (builder) => {
    // ─── Login ────────────────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Login failed";
        state.isAuthenticated = false;
      });

    // ─── Register ─────────────────────────────────────────────────────────────
    builder
      .addCase(registerThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Registration failed";
        state.isAuthenticated = false;
      });

    // ─── Logout ───────────────────────────────────────────────────────────────
    builder
      .addCase(logoutThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutThunk.fulfilled, () => {
        return {
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          permissions: [],
          currentStoreId: null,
        };
      })
      .addCase(logoutThunk.rejected, () => {
        // Even on logout failure, reset state for security
        return {
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          permissions: [],
          currentStoreId: null,
        };
      });

    // ─── Fetch Profile ────────────────────────────────────────────────────────
    builder
      .addCase(fetchProfileThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchProfileThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to fetch profile";
      });

    // ─── Set Current Store ────────────────────────────────────────────────────
    builder
      .addCase(setCurrentStoreThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setCurrentStoreThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStoreId = action.payload.storeId;
        state.permissions = action.payload.permissions;
        state.error = null;
      })
      .addCase(setCurrentStoreThunk.rejected, (state, action) => {
        state.loading = false;
        state.currentStoreId = null;
        state.permissions = [];
        state.error =
          (action.payload as string) || "Failed to load store permissions";
      });
  },
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const { setCurrentStore, clearAuthError, resetAuth } = authSlice.actions;
export default authSlice.reducer;
