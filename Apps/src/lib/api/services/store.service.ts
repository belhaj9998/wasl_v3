/**
 * Store Service
 * Handles store creation and subscription info retrieval for the store admin dashboard.
 */

import { apiClient } from "@/lib/api/client";
import type { ApiResponse, Store } from "@/types";
import { API_ENDPOINTS } from "@/lib/constants";

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
interface CreateStoreApiResponse {
  store: Store;
  roles: unknown[];
  membership: unknown;
  subscription: unknown;
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
   */
  create(data: CreateStoreRequest) {
    return apiClient<ApiResponse<CreateStoreApiResponse>>(
      API_ENDPOINTS.AUTH.CREATE_STORE,
      {
        method: "POST",
        body: data,
      },
    ).then((res) => ({ ...res, data: res.data.store }) as ApiResponse<Store>);
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
