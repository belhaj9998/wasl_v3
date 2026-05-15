/**
 * Category Service
 * Store-scoped category management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ApiResponse,
  Category,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  parent_id?: number | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {}

export interface ReorderPayload {
  items: Array<{ id: number; sort_order: number }>;
}

export const categoryService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Category>>(
      `${API_ENDPOINTS.STORE.CATEGORIES(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, categoryId: number) {
    return apiClient<ApiResponse<Category>>(
      `${API_ENDPOINTS.STORE.CATEGORIES(storeId)}/${categoryId}`,
      { storeId },
    );
  },

  create(storeId: number, payload: CreateCategoryPayload) {
    return apiClient<ApiResponse<Category>>(
      API_ENDPOINTS.STORE.CATEGORIES(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  update(storeId: number, categoryId: number, payload: UpdateCategoryPayload) {
    return apiClient<ApiResponse<Category>>(
      `${API_ENDPOINTS.STORE.CATEGORIES(storeId)}/${categoryId}`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },

  delete(storeId: number, categoryId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.CATEGORIES(storeId)}/${categoryId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  reorder(storeId: number, payload: ReorderPayload) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.CATEGORIES(storeId)}/reorder`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },
};
