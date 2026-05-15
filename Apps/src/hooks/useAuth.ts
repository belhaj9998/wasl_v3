/**
 * Auth Hook
 * Provides auth state selectors and dispatched actions for authentication.
 *
 * Requirements: 15.5, 6.1
 */

import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import {
  loginThunk,
  registerThunk,
  logoutThunk,
  fetchProfileThunk,
} from "@/lib/store/slices/auth.thunks";
import type { LoginPayload, RegisterPayload } from "@/types";

/**
 * Hook providing auth state and actions.
 * Returns user info, authentication status, and action dispatchers.
 */
export function useAuth() {
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const loading = useAppSelector((state) => state.auth.loading);
  const error = useAppSelector((state) => state.auth.error);
  const permissions = useAppSelector((state) => state.auth.permissions);
  const currentStoreId = useAppSelector((state) => state.auth.currentStoreId);

  const login = useCallback(
    (payload: LoginPayload) => dispatch(loginThunk(payload)),
    [dispatch],
  );

  const register = useCallback(
    (payload: RegisterPayload) => dispatch(registerThunk(payload)),
    [dispatch],
  );

  const logout = useCallback(() => dispatch(logoutThunk()), [dispatch]);

  const fetchProfile = useCallback(
    () => dispatch(fetchProfileThunk()),
    [dispatch],
  );

  return {
    user,
    isAuthenticated,
    loading,
    error,
    permissions,
    currentStoreId,
    login,
    register,
    logout,
    fetchProfile,
  };
}
