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
interface CategoryResponse {
  category: Category;
}

type CategoryListParams = PaginationParams & {
  flat?: boolean;
  parent_id?: number | null;
  is_active?: boolean;
};
export const categoryService = {
  getAll(storeId: number, params?: CategoryListParams) {
    const searchParams = new URLSearchParams();
    searchParams.set("flat", String(params?.flat ?? true));

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }

    const query = `?${searchParams.toString()}`;
    return apiClient<PaginatedResponse<Category>>(
      `${API_ENDPOINTS.STORE.CATEGORIES(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, categoryId: number) {
    return apiClient<ApiResponse<CategoryResponse>>(
      `${API_ENDPOINTS.STORE.CATEGORIES(storeId)}/${categoryId}`,
      { storeId },
    ).then(
      (res) => ({ ...res, data: res.data.category }) as ApiResponse<Category>,
    );
  },

  create(storeId: number, payload: CreateCategoryPayload) {
    return apiClient<ApiResponse<CategoryResponse>>(
      API_ENDPOINTS.STORE.CATEGORIES(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    ).then(
      (res) => ({ ...res, data: res.data.category }) as ApiResponse<Category>,
    );
  },

  update(storeId: number, categoryId: number, payload: UpdateCategoryPayload) {
    return apiClient<ApiResponse<CategoryResponse>>(
      `${API_ENDPOINTS.STORE.CATEGORIES(storeId)}/${categoryId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    ).then(
      (res) => ({ ...res, data: res.data.category }) as ApiResponse<Category>,
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
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },
};
