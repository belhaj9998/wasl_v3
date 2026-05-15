/**
 * Store Hook
 * Provides store context selectors and store switching logic.
 *
 * Requirements: 6.1
 */

import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { setCurrentStoreThunk } from "@/lib/store/slices/auth.thunks";

/**
 * Hook providing store context state and actions.
 * Returns current store ID, permissions, available stores, and switchStore action.
 */
export function useStore() {
  const dispatch = useAppDispatch();

  const currentStoreId = useAppSelector((state) => state.auth.currentStoreId);
  const permissions = useAppSelector((state) => state.auth.permissions);
  const stores = useAppSelector((state) => state.platform.stores.items);

  const switchStore = useCallback(
    (storeId: number) => dispatch(setCurrentStoreThunk({ storeId })),
    [dispatch],
  );

  return {
    currentStoreId,
    permissions,
    stores,
    switchStore,
  };
}
