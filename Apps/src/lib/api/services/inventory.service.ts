/**
 * Inventory Service
 * Store-scoped inventory management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ApiResponse,
  InventoryLevel,
  InventoryMovement,
  InventoryMovementType,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

export interface AdjustInventoryPayload {
  type: InventoryMovementType;
  quantity_change: number;
  reason?: string;
}

export interface InventoryItem extends InventoryLevel {
  product_name: string;
  variant_title: string;
  sku: string;
}

export const inventoryService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<InventoryItem>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}${query}`,
      { storeId },
    );
  },

  getLowStock(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<InventoryItem>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}/low-stock${query}`,
      { storeId },
    );
  },

  getMovements(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<InventoryMovement>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}/movements${query}`,
      { storeId },
    );
  },

  getByVariant(storeId: number, variantId: number) {
    return apiClient<ApiResponse<InventoryLevel>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}/variants/${variantId}`,
      { storeId },
    );
  },

  adjust(storeId: number, variantId: number, payload: AdjustInventoryPayload) {
    return apiClient<ApiResponse<InventoryMovement>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}/variants/${variantId}/adjust`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  getVariantMovements(
    storeId: number,
    variantId: number,
    params?: PaginationParams,
  ) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<InventoryMovement>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}/variants/${variantId}/movements${query}`,
      { storeId },
    );
  },
};
