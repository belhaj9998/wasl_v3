/**
 * Order Service
 * Store-scoped order management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ApiResponse,
  EligibleAssignee,
  Order,
  OrderNote,
  OrderSource,
  OrderStatus,
  PaginatedResponse,
  PaginationParams,
  PaymentStatus,
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
    product_id: number;
    variant_id: number;
    quantity: number;
  }>;
  notes_from_customer?: string;
  coupon_code?: string;
  source?: OrderSource;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  note?: string;
}

export interface AddNotePayload {
  note: string;
}

/**
 * Body for PATCH /api/stores/:storeId/orders/:orderId/assignee.
 * Mirrors the server's `assignAssigneeSchema` ({ user_id: number | null }).
 */
export interface AssignAssigneePayload {
  user_id: number | null;
}

export interface UpdateOrderSourcePayload {
  source: OrderSource;
}

export interface OrderListParams extends PaginationParams {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  source?: OrderSource[];
  customer_id?: number;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  tag_ids?: number[];
  assigned_user_id?: string;
  sort_by?: "placed_at" | "grand_total" | "order_number";
  sort_order?: "asc" | "desc";
}

/**
 * Query parameters for the orders counts endpoint.
 * Mirrors the list endpoint's filters EXCEPT status, page, limit, sort_by, sort_order.
 */
export interface OrderCountsParams {
  search?: string;
  payment_status?: PaymentStatus;
  source?: OrderSource[];
  customer_id?: number;
  date_from?: string; // ISO 8601 date string
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
}

/**
 * Response shape for the orders counts endpoint.
 * `total` equals sum of by_status values; by_status always has all 11 keys.
 */
export interface OrderCountsResponse {
  total: number;
  by_status: Record<OrderStatus, number>;
}

/**
 * Response shape for GET /api/stores/:storeId/orders/stats/kpis.
 *
 * - orders_today_count, pending_orders_count: non-negative integers (JSON numbers).
 * - revenue_today, aov_today: JSON strings produced server-side via Decimal.toFixed(3).
 *   Render as-is (do NOT reuse 2-decimal formatCurrency util) and append the LYD suffix.
 */
export interface OrderKpisResponse {
  orders_today_count: number;
  revenue_today: string;
  aov_today: string;
  pending_orders_count: number;
}

export const orderService = {
  getAll(storeId: number, params?: OrderListParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Order>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, orderId: number) {
    return apiClient<ApiResponse<{ order: Order }>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/${orderId}`,
      { storeId },
    );
  },

  create(storeId: number, payload: CreateOrderPayload) {
    return apiClient<ApiResponse<{ order: Order }>>(
      API_ENDPOINTS.STORE.ORDERS(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  updateStatus(
    storeId: number,
    orderId: number,
    payload: UpdateOrderStatusPayload,
  ) {
    return apiClient<ApiResponse<{ order: Order }>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/${orderId}/status`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },

  cancel(storeId: number, orderId: number, reason?: string) {
    return apiClient<ApiResponse<{ order: Order }>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/${orderId}/cancel`,
      {
        method: "POST",
        body: reason ? { reason } : undefined,
        storeId,
      },
    );
  },

  addNote(storeId: number, orderId: number, payload: AddNotePayload) {
    return apiClient<ApiResponse<{ timeline: TimelineEvent }>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/${orderId}/notes`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  getTimeline(storeId: number, orderId: number) {
    return apiClient<PaginatedResponse<TimelineEvent>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/${orderId}/timeline`,
      { storeId },
    );
  },

  getCounts(storeId: number, params?: OrderCountsParams) {
    const cleanParams =
      params &&
      Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          acc[k] = String(v);
        }
        return acc;
      }, {});

    const query =
      cleanParams && Object.keys(cleanParams).length > 0
        ? `?${new URLSearchParams(cleanParams).toString()}`
        : "";

    return apiClient<ApiResponse<OrderCountsResponse>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/stats/counts${query}`,
      { storeId },
    );
  },
  getKpis(storeId: number) {
    return apiClient<ApiResponse<OrderKpisResponse>>(
      `${API_ENDPOINTS.STORE.ORDERS(storeId)}/stats/kpis`,
      { storeId },
    );
  },

  /** GET /api/stores/:storeId/orders/assignees */
  getEligibleAssignees(storeId: number) {
    return apiClient<ApiResponse<{ assignees: EligibleAssignee[] }>>(
      API_ENDPOINTS.STORE.ORDER_ASSIGNEES(storeId),
      { storeId },
    );
  },

  /** PATCH /api/stores/:storeId/orders/:orderId/assignee */
  assignAssignee(
    storeId: number,
    orderId: number,
    payload: AssignAssigneePayload,
  ) {
    return apiClient<ApiResponse<{ order: Order }>>(
      API_ENDPOINTS.STORE.ORDER_ASSIGNEE(storeId, orderId),
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },

  /** PATCH /api/stores/:storeId/orders/:orderId/source */
  updateOrderSource(
    storeId: number,
    orderId: number,
    payload: UpdateOrderSourcePayload,
  ) {
    return apiClient<ApiResponse<{ order: Order }>>(
      API_ENDPOINTS.STORE.ORDER_SOURCE(storeId, orderId),
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },
};
