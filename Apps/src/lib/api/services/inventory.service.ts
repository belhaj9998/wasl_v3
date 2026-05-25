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

export interface UpdateInventoryPayload {
  available_quantity?: number;
  low_stock_threshold?: number;
  reason?: string;
}

export interface InventoryItem extends InventoryLevel {
  product_name: string;
  variant_title: string;
  sku: string;
}
interface BackendInventory {
  id: number;
  store_id: number;
  variant_id: number;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  updated_at: string;
  variant?: {
    title: string;
    sku: string | null;
    product?: {
      name: string;
    };
  };
}

interface InventoryResponse {
  inventory: BackendInventory;
}

function normalizeInventory(item: BackendInventory): InventoryItem {
  return {
    variant_id: item.variant_id,
    total_quantity: item.total_quantity,
    available_quantity: item.available_quantity,
    reserved_quantity: item.reserved_quantity,
    low_stock_threshold: item.low_stock_threshold,
    product_name: item.variant?.product?.name ?? "",
    variant_title: item.variant?.title ?? "",
    sku: item.variant?.sku ?? "",
  };
}

export const inventoryService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<BackendInventory>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}${query}`,
      { storeId },
    ).then(
      (res) =>
        ({
          ...res,
          data: res.data.map(normalizeInventory),
        }) as PaginatedResponse<InventoryItem>,
    );
  },

  getLowStock(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<BackendInventory>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}/low-stock${query}`,
      { storeId },
    ).then(
      (res) =>
        ({
          ...res,
          data: res.data.map(normalizeInventory),
        }) as PaginatedResponse<InventoryItem>,
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
    return apiClient<ApiResponse<InventoryResponse>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}/${variantId}`,
      { storeId },
    ).then(
      (res) =>
        ({
          ...res,
          data: normalizeInventory(res.data.inventory),
        }) as ApiResponse<InventoryItem>,
    );
  },

  adjust(storeId: number, variantId: number, payload: AdjustInventoryPayload) {
    return apiClient<ApiResponse<InventoryResponse>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}/${variantId}/adjust`,
      {
        method: "POST",
        body: {
          type: payload.type,
          quantity: payload.quantity_change,
          reason: payload.reason,
        },
        storeId,
      },
    ).then(
      (res) =>
        ({
          ...res,
          data: normalizeInventory(res.data.inventory),
        }) as ApiResponse<InventoryItem>,
    );
  },

  update(storeId: number, variantId: number, payload: UpdateInventoryPayload) {
    return apiClient<ApiResponse<InventoryResponse>>(
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}/${variantId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({
          ...res,
          data: normalizeInventory(res.data.inventory),
        }) as ApiResponse<InventoryItem>,
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
      `${API_ENDPOINTS.STORE.INVENTORY(storeId)}/${variantId}/movements${query}`,
      { storeId },
    );
  },
};
