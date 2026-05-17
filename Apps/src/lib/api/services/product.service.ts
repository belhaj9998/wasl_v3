/**
 * Product Service
 * Store-scoped product management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  Product,
  ProductStatus,
  ProductOption,
  ProductVariant,
} from "@/types";

export interface CreateProductPayload {
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  base_price: string;
  compare_at_price?: string;
  cost_price?: string;
  track_inventory?: boolean;
  category_ids?: number[];
  status?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {}

export interface CreateOptionPayload {
  name: string;
  position?: number;
}

export interface UpdateOptionPayload {
  name?: string;
  position?: number;
}

export interface CreateOptionValuePayload {
  value: string;
  position?: number;
}

export interface UpdateOptionValuePayload {
  value?: string;
  position?: number;
}

export interface UpdateVariantPayload {
  price?: string | null;
  compare_at_price?: string | null;
  sku?: string;
  barcode?: string | null;
  is_active?: boolean;
}

export const productService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Product>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, productId: number) {
    return apiClient<ApiResponse<Product>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}`,
      { storeId },
    );
  },

  create(storeId: number, payload: CreateProductPayload) {
    return apiClient<ApiResponse<Product>>(
      API_ENDPOINTS.STORE.PRODUCTS(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  update(storeId: number, productId: number, payload: UpdateProductPayload) {
    return apiClient<ApiResponse<Product>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },

  delete(storeId: number, productId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  changeStatus(storeId: number, productId: number, status: ProductStatus) {
    return apiClient<ApiResponse<Product>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/status`,
      {
        method: "PATCH",
        body: { status },
        storeId,
      },
    );
  },

  publish(storeId: number, productId: number) {
    return apiClient<ApiResponse<Product>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/publish`,
      {
        method: "POST",
        storeId,
      },
    );
  },

  duplicate(storeId: number, productId: number) {
    return apiClient<ApiResponse<Product>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/duplicate`,
      {
        method: "POST",
        storeId,
      },
    );
  },

  // ========== Options ==========

  getOptions(storeId: number, productId: number) {
    return apiClient<ApiResponse<ProductOption[]>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options`,
      { storeId },
    );
  },

  createOption(
    storeId: number,
    productId: number,
    payload: CreateOptionPayload,
  ) {
    return apiClient<ApiResponse<ProductOption>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  updateOption(
    storeId: number,
    productId: number,
    optionId: number,
    payload: UpdateOptionPayload,
  ) {
    return apiClient<ApiResponse<ProductOption>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options/${optionId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },

  deleteOption(storeId: number, productId: number, optionId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options/${optionId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  // ========== Option Values ==========

  addOptionValue(
    storeId: number,
    productId: number,
    optionId: number,
    payload: CreateOptionValuePayload,
  ) {
    return apiClient<ApiResponse<ProductOption>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options/${optionId}/values`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  updateOptionValue(
    storeId: number,
    productId: number,
    optionId: number,
    valueId: number,
    payload: UpdateOptionValuePayload,
  ) {
    return apiClient<ApiResponse<ProductOption>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options/${optionId}/values/${valueId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },

  deleteOptionValue(
    storeId: number,
    productId: number,
    optionId: number,
    valueId: number,
  ) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options/${optionId}/values/${valueId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  // ========== Variants ==========

  getVariants(storeId: number, productId: number) {
    return apiClient<ApiResponse<ProductVariant[]>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/variants`,
      { storeId },
    );
  },

  generateVariants(storeId: number, productId: number) {
    return apiClient<ApiResponse<ProductVariant[]>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/variants/generate`,
      {
        method: "POST",
        storeId,
      },
    );
  },

  getVariant(storeId: number, variantId: number) {
    return apiClient<ApiResponse<ProductVariant>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId).replace("/products", "")}/variants/${variantId}`,
      { storeId },
    );
  },

  updateVariant(
    storeId: number,
    variantId: number,
    payload: UpdateVariantPayload,
  ) {
    return apiClient<ApiResponse<ProductVariant>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId).replace("/products", "")}/variants/${variantId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },

  deleteVariant(storeId: number, variantId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId).replace("/products", "")}/variants/${variantId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  setDefaultVariant(storeId: number, variantId: number) {
    return apiClient<ApiResponse<ProductVariant>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId).replace("/products", "")}/variants/${variantId}/set-default`,
      {
        method: "PATCH",
        storeId,
      },
    );
  },
};
