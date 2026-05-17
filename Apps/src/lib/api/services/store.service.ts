/**
 * Store Service
 * Handles store creation and subscription info retrieval for the store admin dashboard.
 */

import { apiClient } from "@/lib/api/client";
import type { ApiResponse, Store } from "@/types";

// ---------------------------------------------------------------------------
// Request / Response interfaces
// ---------------------------------------------------------------------------

export interface CreateStoreRequest {
  name: string;
  domain: string;
}

export interface CreateStoreResponse {
  id: number;
  name: string;
  domain: string;
  status: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface UserSubscriptionInfo {
  hasActiveSubscription: boolean;
  maxStores: number | null;
  currentStoreCount: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const storeService = {
  /**
   * Create a new store.
   * POST /stores
   */
  create(data: CreateStoreRequest) {
    return apiClient<ApiResponse<Store>>("/stores", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Get the current user's subscription info (max stores, active status, current count).
   * GET /auth/me/subscription
   */
  getUserSubscriptionInfo() {
    return apiClient<ApiResponse<UserSubscriptionInfo>>(
      "/auth/me/subscription",
    );
  },
};
