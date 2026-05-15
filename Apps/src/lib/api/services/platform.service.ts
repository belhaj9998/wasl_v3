/**
 * Platform Service
 * Platform-level admin operations for users, stores, plans, subscriptions,
 * permissions, and dashboard analytics.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  Plan,
  Store,
  Subscription,
  User,
} from "@/types";

// --- Payload types ---

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  system_role?: string;
  is_active?: boolean;
}

export interface UpdateStoreStatusPayload {
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
}

export interface CreatePlanPayload {
  code: string;
  name: string;
  price_monthly: string;
  price_yearly?: string;
  features?: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdatePlanPayload extends Partial<CreatePlanPayload> {}

export interface UpdateSubscriptionPayload {
  plan_id?: number;
  status?: string;
  billing_cycle?: "MONTHLY" | "YEARLY";
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  group: string;
  description: string | null;
}

export interface CreatePermissionPayload {
  code: string;
  name: string;
  group: string;
  description?: string;
}

export interface UpdatePermissionPayload extends Partial<CreatePermissionPayload> {}

export interface DashboardStats {
  total_users: number;
  total_stores: number;
  total_orders: number;
  total_revenue: string;
  active_subscriptions: number;
}

export interface RevenueData {
  period: string;
  revenue: string;
  orders: number;
}

export interface GrowthData {
  period: string;
  users: number;
  stores: number;
}

// --- Service ---

export const platformService = {
  // Users
  users: {
    getAll(params?: PaginationParams) {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : "";
      return apiClient<PaginatedResponse<User>>(
        `${API_ENDPOINTS.PLATFORM.USERS}${query}`,
      );
    },

    getById(userId: number) {
      return apiClient<ApiResponse<User>>(
        `${API_ENDPOINTS.PLATFORM.USERS}/${userId}`,
      );
    },

    update(userId: number, payload: UpdateUserPayload) {
      return apiClient<ApiResponse<User>>(
        `${API_ENDPOINTS.PLATFORM.USERS}/${userId}`,
        {
          method: "PATCH",
          body: payload,
        },
      );
    },

    delete(userId: number) {
      return apiClient<ApiResponse<null>>(
        `${API_ENDPOINTS.PLATFORM.USERS}/${userId}`,
        { method: "DELETE" },
      );
    },
  },

  // Stores
  stores: {
    getAll(params?: PaginationParams) {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : "";
      return apiClient<PaginatedResponse<Store>>(
        `${API_ENDPOINTS.PLATFORM.STORES}${query}`,
      );
    },

    getById(storeId: number) {
      return apiClient<ApiResponse<Store>>(
        `${API_ENDPOINTS.PLATFORM.STORES}/${storeId}`,
      );
    },

    updateStatus(storeId: number, payload: UpdateStoreStatusPayload) {
      return apiClient<ApiResponse<Store>>(
        `${API_ENDPOINTS.PLATFORM.STORES}/${storeId}/status`,
        {
          method: "PATCH",
          body: payload,
        },
      );
    },

    delete(storeId: number) {
      return apiClient<ApiResponse<null>>(
        `${API_ENDPOINTS.PLATFORM.STORES}/${storeId}`,
        { method: "DELETE" },
      );
    },
  },

  // Plans
  plans: {
    getAll(params?: PaginationParams) {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : "";
      return apiClient<PaginatedResponse<Plan>>(
        `${API_ENDPOINTS.PLATFORM.PLANS}${query}`,
      );
    },

    getById(planId: number) {
      return apiClient<ApiResponse<Plan>>(
        `${API_ENDPOINTS.PLATFORM.PLANS}/${planId}`,
      );
    },

    create(payload: CreatePlanPayload) {
      return apiClient<ApiResponse<Plan>>(API_ENDPOINTS.PLATFORM.PLANS, {
        method: "POST",
        body: payload,
      });
    },

    update(planId: number, payload: UpdatePlanPayload) {
      return apiClient<ApiResponse<Plan>>(
        `${API_ENDPOINTS.PLATFORM.PLANS}/${planId}`,
        {
          method: "PATCH",
          body: payload,
        },
      );
    },

    delete(planId: number) {
      return apiClient<ApiResponse<null>>(
        `${API_ENDPOINTS.PLATFORM.PLANS}/${planId}`,
        { method: "DELETE" },
      );
    },
  },

  // Subscriptions
  subscriptions: {
    getAll(params?: PaginationParams) {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : "";
      return apiClient<PaginatedResponse<Subscription>>(
        `${API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS}${query}`,
      );
    },

    getById(subscriptionId: number) {
      return apiClient<ApiResponse<Subscription>>(
        `${API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS}/${subscriptionId}`,
      );
    },

    update(subscriptionId: number, payload: UpdateSubscriptionPayload) {
      return apiClient<ApiResponse<Subscription>>(
        `${API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS}/${subscriptionId}`,
        {
          method: "PATCH",
          body: payload,
        },
      );
    },
  },

  // Permissions
  permissions: {
    getAll() {
      return apiClient<ApiResponse<Permission[]>>("/platform/permissions").then(
        (res) => {
          // Map backend fields (module/action) to frontend fields (group/name)
          if (res.data && Array.isArray((res.data as any).permissions)) {
            const mapped = (res.data as any).permissions.map((p: any) => ({
              id: p.id,
              code: p.code,
              name: p.action ?? p.name,
              group: p.module ?? p.group,
              description: p.description,
            }));
            return { ...res, data: mapped } as ApiResponse<Permission[]>;
          }
          return res;
        },
      );
    },

    create(payload: CreatePermissionPayload) {
      // Map frontend fields (name/group) to backend fields (action/module)
      const backendPayload = {
        code: payload.code,
        module: payload.group,
        action: payload.name,
        description: payload.description,
      };
      return apiClient<ApiResponse<Permission>>("/platform/permissions", {
        method: "POST",
        body: backendPayload,
      });
    },

    update(permissionId: number, payload: UpdatePermissionPayload) {
      // Map frontend fields (name/group) to backend fields (action/module)
      const backendPayload: Record<string, unknown> = {};
      if (payload.code !== undefined) backendPayload.code = payload.code;
      if (payload.name !== undefined) backendPayload.action = payload.name;
      if (payload.group !== undefined) backendPayload.module = payload.group;
      if (payload.description !== undefined)
        backendPayload.description = payload.description;
      return apiClient<ApiResponse<Permission>>(
        `/platform/permissions/${permissionId}`,
        {
          method: "PATCH",
          body: backendPayload,
        },
      );
    },

    delete(permissionId: number) {
      return apiClient<ApiResponse<null>>(
        `/platform/permissions/${permissionId}`,
        { method: "DELETE" },
      );
    },
  },

  // Dashboard
  dashboard: {
    getStats() {
      return apiClient<ApiResponse<{ stats: DashboardStats }>>(
        API_ENDPOINTS.PLATFORM.DASHBOARD.STATS,
      );
    },

    getRevenue(params?: { period?: string }) {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : "";
      return apiClient<ApiResponse<{ revenue: RevenueData[] }>>(
        `${API_ENDPOINTS.PLATFORM.DASHBOARD.REVENUE}${query}`,
      );
    },

    getGrowth(params?: { period?: string }) {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : "";
      return apiClient<ApiResponse<{ growth: GrowthData[] }>>(
        `${API_ENDPOINTS.PLATFORM.DASHBOARD.GROWTH}${query}`,
      );
    },
  },
};
