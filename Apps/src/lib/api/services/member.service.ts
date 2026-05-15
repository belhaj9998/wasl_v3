/**
 * Member Service
 * Store-scoped team member management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  User,
} from "@/types";

export interface Member {
  id: number;
  user_id: number;
  store_id: number;
  role_id: number;
  user: User;
  role: { id: number; name: string };
  joined_at: string;
}

export interface InviteMemberPayload {
  email: string;
  role_id: number;
}

export interface ChangeRolePayload {
  role_id: number;
}

export const memberService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Member>>(
      `${API_ENDPOINTS.STORE.MEMBERS(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, memberId: number) {
    return apiClient<ApiResponse<Member>>(
      `${API_ENDPOINTS.STORE.MEMBERS(storeId)}/${memberId}`,
      { storeId },
    );
  },

  invite(storeId: number, payload: InviteMemberPayload) {
    return apiClient<ApiResponse<Member>>(
      `${API_ENDPOINTS.STORE.MEMBERS(storeId)}/invite`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  changeRole(storeId: number, memberId: number, payload: ChangeRolePayload) {
    return apiClient<ApiResponse<Member>>(
      `${API_ENDPOINTS.STORE.MEMBERS(storeId)}/${memberId}/role`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },

  remove(storeId: number, memberId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.MEMBERS(storeId)}/${memberId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  resendInvite(storeId: number, memberId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.MEMBERS(storeId)}/${memberId}/resend-invite`,
      {
        method: "POST",
        storeId,
      },
    );
  },
};
