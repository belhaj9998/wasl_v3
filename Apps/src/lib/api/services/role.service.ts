/**
 * Role Service
 * Store-scoped role and permission management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

export interface Role {
  id: number;
  store_id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRolePayload extends Partial<CreateRolePayload> {}

export interface UpdatePermissionsPayload {
  permissions: string[];
}

export const roleService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Role>>(
      `${API_ENDPOINTS.STORE.ROLES(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, roleId: number) {
    return apiClient<ApiResponse<Role>>(
      `${API_ENDPOINTS.STORE.ROLES(storeId)}/${roleId}`,
      { storeId },
    );
  },

  create(storeId: number, payload: CreateRolePayload) {
    return apiClient<ApiResponse<Role>>(API_ENDPOINTS.STORE.ROLES(storeId), {
      method: "POST",
      body: payload,
      storeId,
    });
  },

  update(storeId: number, roleId: number, payload: UpdateRolePayload) {
    return apiClient<ApiResponse<Role>>(
      `${API_ENDPOINTS.STORE.ROLES(storeId)}/${roleId}`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },

  delete(storeId: number, roleId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.ROLES(storeId)}/${roleId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  updatePermissions(
    storeId: number,
    roleId: number,
    payload: UpdatePermissionsPayload,
  ) {
    return apiClient<ApiResponse<Role>>(
      `${API_ENDPOINTS.STORE.ROLES(storeId)}/${roleId}/permissions`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },
};
