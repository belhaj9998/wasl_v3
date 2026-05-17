"use client";

/**
 * Store Subscription Context Provider
 * Provides subscription info (maxStores, hasActiveSubscription, storeCount)
 * and store list management to child components in the store admin layout.
 *
 * Requirements: 5.1, 5.3, 5.4
 */

import { createContext, useContext } from "react";
import type { Store } from "@/types";

export interface StoreSubscriptionContextValue {
  /** Number of active stores (excluding ARCHIVED and soft-deleted) */
  storeCount: number;
  /** Maximum stores allowed by subscription plan (null = unlimited) */
  maxStores: number | null;
  /** Whether the user has an active or trialing subscription */
  hasActiveSubscription: boolean;
  /** Full list of user's stores */
  userStores: Store[];
  /** Whether stores are still loading */
  storesLoading: boolean;
  /** Callback to refresh the store list (e.g., after creating a new store) */
  refreshStores: () => Promise<void>;
}

const defaultValue: StoreSubscriptionContextValue = {
  storeCount: 0,
  maxStores: null,
  hasActiveSubscription: false,
  userStores: [],
  storesLoading: true,
  refreshStores: async () => {},
};

export const StoreSubscriptionContext =
  createContext<StoreSubscriptionContextValue>(defaultValue);

/**
 * Hook to access store subscription context.
 * Must be used within a StoreSubscriptionProvider (i.e., inside StoreAdminLayout).
 */
export function useStoreSubscription(): StoreSubscriptionContextValue {
  return useContext(StoreSubscriptionContext);
}
