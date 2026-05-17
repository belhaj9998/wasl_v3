/**
 * Store Hook
 * Provides store context selectors and store switching logic.
 *
 * Requirements: 4.5, 6.1
 */

import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { setCurrentStoreThunk } from "@/lib/store/slices/auth.thunks";
import { resetStoreData } from "@/lib/store/resetStoreData";

/**
 * Hook providing store context state and actions.
 * Returns current store ID, permissions, available stores, switchStore, and resetData actions.
 *
 * switchStore: Resets all store-scoped data (slices, cache, pending requests)
 *              then loads the new store's permissions.
 * resetData:   Resets store-scoped data without switching (useful for manual cleanup).
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

  const resetData = useCallback(() => dispatch(resetStoreData()), [dispatch]);

  return {
    currentStoreId,
    permissions,
    stores,
    switchStore,
    resetData,
  };
}
