/**
 * Role Service
 * Store-scoped role and permission management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ApiResponse, PaginationParams } from "@/types";

export interface Role {
  id: number;
  store_id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: number[];
  created_at: string;
  updated_at: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
}

export interface UpdateRolePayload extends Partial<CreateRolePayload> {}

export interface UpdatePermissionsPayload {
  permission_ids: number[];
}

interface BackendRole {
  id: number;
  store_id: number;
  name: string;
  description: string | null;
  is_protected: boolean;
  permissions?: Array<{
    permission: {
      id: number;
      code: string;
    };
  }>;
  created_at: string;
  updated_at: string;
}

interface RolesResponse {
  roles: BackendRole[];
}

interface RoleResponse {
  role: BackendRole;
}

function normalizeRole(role: BackendRole): Role {
  return {
    id: role.id,
    store_id: role.store_id,
    name: role.name,
    description: role.description,
    is_system: role.is_protected,
    permissions: role.permissions?.map((item) => item.permission.id) ?? [],
    created_at: role.created_at,
    updated_at: role.updated_at,
  };
}

export const roleService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<ApiResponse<RolesResponse>>(
      `${API_ENDPOINTS.STORE.ROLES(storeId)}${query}`,
      { storeId },
    ).then(
      (res) =>
        ({ ...res, data: res.data.roles.map(normalizeRole) }) as ApiResponse<
          Role[]
        >,
    );
  },

  getById(storeId: number, roleId: number) {
    return apiClient<ApiResponse<RoleResponse>>(
      `${API_ENDPOINTS.STORE.ROLES(storeId)}/${roleId}`,
      { storeId },
    ).then(
      (res) =>
        ({ ...res, data: normalizeRole(res.data.role) }) as ApiResponse<Role>,
    );
  },

  create(storeId: number, payload: CreateRolePayload) {
    return apiClient<ApiResponse<RoleResponse>>(
      API_ENDPOINTS.STORE.ROLES(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({ ...res, data: normalizeRole(res.data.role) }) as ApiResponse<Role>,
    );
  },

  update(storeId: number, roleId: number, payload: UpdateRolePayload) {
    return apiClient<ApiResponse<RoleResponse>>(
      `${API_ENDPOINTS.STORE.ROLES(storeId)}/${roleId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({ ...res, data: normalizeRole(res.data.role) }) as ApiResponse<Role>,
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
    return apiClient<ApiResponse<RoleResponse>>(
      `${API_ENDPOINTS.STORE.ROLES(storeId)}/${roleId}/permissions`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({ ...res, data: normalizeRole(res.data.role) }) as ApiResponse<Role>,
    );
  },
};
