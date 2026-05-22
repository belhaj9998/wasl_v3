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
  description?: string | null;
  short_description?: string | null;
  base_price: string;
  compare_at_price?: string | null;
  cost_price?: string | null;
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

interface ProductResponse {
  product: Product;
}

interface ProductOptionsResponse {
  options: ProductOption[];
}

interface ProductOptionResponse {
  option: ProductOption;
}

interface ProductVariantsResponse {
  variants: ProductVariant[];
}

interface ProductVariantResponse {
  variant: ProductVariant;
}

interface GenerateVariantsResponse {
  created: number;
  skipped: number;
  total: number;
}

interface DeleteProductResponse {
  action: "deleted" | "archived";
  productId?: number;
  product?: Product;
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
    return apiClient<ApiResponse<ProductResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}`,
      { storeId },
    ).then(
      (res) => ({ ...res, data: res.data.product }) as ApiResponse<Product>,
    );
  },

  create(storeId: number, payload: CreateProductPayload) {
    return apiClient<ApiResponse<ProductResponse>>(
      API_ENDPOINTS.STORE.PRODUCTS(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    ).then(
      (res) => ({ ...res, data: res.data.product }) as ApiResponse<Product>,
    );
  },

  update(storeId: number, productId: number, payload: UpdateProductPayload) {
    return apiClient<ApiResponse<ProductResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    ).then(
      (res) => ({ ...res, data: res.data.product }) as ApiResponse<Product>,
    );
  },

  delete(storeId: number, productId: number) {
    return apiClient<ApiResponse<DeleteProductResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  changeStatus(storeId: number, productId: number, status: ProductStatus) {
    return apiClient<ApiResponse<ProductResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/status`,
      {
        method: "PATCH",
        body: { status },
        storeId,
      },
    ).then(
      (res) => ({ ...res, data: res.data.product }) as ApiResponse<Product>,
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
    return apiClient<ApiResponse<ProductResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/duplicate`,
      {
        method: "POST",
        storeId,
      },
    ).then(
      (res) => ({ ...res, data: res.data.product }) as ApiResponse<Product>,
    );
  },

  // ========== Options ==========

  getOptions(storeId: number, productId: number) {
    return apiClient<ApiResponse<ProductOptionsResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options`,
      { storeId },
    ).then(
      (res) =>
        ({ ...res, data: res.data.options }) as ApiResponse<ProductOption[]>,
    );
  },

  createOption(
    storeId: number,
    productId: number,
    payload: CreateOptionPayload,
  ) {
    return apiClient<ApiResponse<ProductOptionResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({ ...res, data: res.data.option }) as ApiResponse<ProductOption>,
    );
  },

  updateOption(
    storeId: number,
    productId: number,
    optionId: number,
    payload: UpdateOptionPayload,
  ) {
    return apiClient<ApiResponse<ProductOptionResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options/${optionId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({ ...res, data: res.data.option }) as ApiResponse<ProductOption>,
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
    return apiClient<ApiResponse<ProductOptionResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options/${optionId}/values`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({ ...res, data: res.data.option }) as ApiResponse<ProductOption>,
    );
  },

  updateOptionValue(
    storeId: number,
    productId: number,
    optionId: number,
    valueId: number,
    payload: UpdateOptionValuePayload,
  ) {
    return apiClient<ApiResponse<ProductOptionResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options/${optionId}/values/${valueId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({ ...res, data: res.data.option }) as ApiResponse<ProductOption>,
    );
  },

  deleteOptionValue(
    storeId: number,
    productId: number,
    optionId: number,
    valueId: number,
  ) {
    return apiClient<ApiResponse<ProductOptionResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/options/${optionId}/values/${valueId}`,
      {
        method: "DELETE",
        storeId,
      },
    ).then(
      (res) =>
        ({ ...res, data: res.data.option }) as ApiResponse<ProductOption>,
    );
  },

  // ========== Variants ==========

  getVariants(storeId: number, productId: number) {
    return apiClient<ApiResponse<ProductVariantsResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/variants`,
      { storeId },
    ).then(
      (res) =>
        ({ ...res, data: res.data.variants }) as ApiResponse<ProductVariant[]>,
    );
  },

  generateVariants(storeId: number, productId: number) {
    return apiClient<ApiResponse<GenerateVariantsResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId)}/${productId}/variants/generate`,
      {
        method: "POST",
        storeId,
      },
    );
  },

  getVariant(storeId: number, variantId: number) {
    return apiClient<ApiResponse<ProductVariantResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId).replace("/products", "")}/variants/${variantId}`,
      { storeId },
    ).then(
      (res) =>
        ({ ...res, data: res.data.variant }) as ApiResponse<ProductVariant>,
    );
  },

  updateVariant(
    storeId: number,
    variantId: number,
    payload: UpdateVariantPayload,
  ) {
    return apiClient<ApiResponse<ProductVariantResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId).replace("/products", "")}/variants/${variantId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({ ...res, data: res.data.variant }) as ApiResponse<ProductVariant>,
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
    return apiClient<ApiResponse<ProductVariantResponse>>(
      `${API_ENDPOINTS.STORE.PRODUCTS(storeId).replace("/products", "")}/variants/${variantId}/set-default`,
      {
        method: "PATCH",
        storeId,
      },
    ).then(
      (res) =>
        ({ ...res, data: res.data.variant }) as ApiResponse<ProductVariant>,
    );
  },
};
