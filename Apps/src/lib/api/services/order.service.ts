/**
 * Order Service
 * Store-scoped order management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ApiResponse,
  Order,
  OrderNote,
  OrderStatus,
  PaginatedResponse,
  PaginationParams,
  TimelineEvent,
} from "@/types";

export interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  shipping_address: {
    full_name: string;
    city: string;
    street_line_1: string;
    street_line_2?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  payment_method: string;
  items: Array<{
    variant_id: number;
    quantity: number;
  }>;
  notes_from_customer?: string;
  coupon_code?: string;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  note?: string;
}

export interface AddNotePayload {
  content: string;
}

export const orderService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Order>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, orderId: number) {
    return apiClient<ApiResponse<Order>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/${orderId}`,
      { storeId },
    );
  },

  create(storeId: number, payload: CreateOrderPayload) {
    return apiClient<ApiResponse<Order>>(API_ENDPOINTS.STORE.ORDERS(storeId), {
      method: "POST",
      body: payload,
      storeId,
    });
  },

  updateStatus(
    storeId: number,
    orderId: number,
    payload: UpdateOrderStatusPayload,
  ) {
    return apiClient<ApiResponse<Order>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/${orderId}/status`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },

  cancel(storeId: number, orderId: number, reason?: string) {
    return apiClient<ApiResponse<Order>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/${orderId}/cancel`,
      {
        method: "POST",
        body: reason ? { reason } : undefined,
        storeId,
      },
    );
  },

  addNote(storeId: number, orderId: number, payload: AddNotePayload) {
    return apiClient<ApiResponse<OrderNote>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/${orderId}/notes`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  getTimeline(storeId: number, orderId: number) {
    return apiClient<ApiResponse<TimelineEvent[]>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/${orderId}/timeline`,
      { storeId },
    );
  },
};
