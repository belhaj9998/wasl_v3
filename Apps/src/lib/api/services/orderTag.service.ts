/**
 * Order Tag Service
 *
 * Store-scoped CRUD on tag definitions plus assignment operations against
 * orders (replace-on-order, bulk add, bulk remove). Wraps `apiClient` and
 * forwards `storeId` so the `x-store-id` tenant header is always set.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ApiResponse } from "@/types";
import type {
  BulkTagPayload,
  CreateOrderTagPayload,
  OrderTag,
  OrderTagSummary,
  UpdateOrderTagPayload,
} from "@/types/orderTag.types";

export const orderTagService = {
  /**
   * GET /stores/:storeId/order-tags
   *
   * @param withCounts If true, the response includes `assignment_count` per
   *   tag for the settings page. Defaults to `false` for the lightweight
   *   picker/filter list to keep payloads small.
   */
  list(storeId: number, withCounts = false) {
    const query = withCounts ? "?with_counts=true" : "";
    return apiClient<ApiResponse<{ tags: OrderTag[] }>>(
      `${API_ENDPOINTS.STORE.ORDER_TAGS(storeId)}${query}`,
      { storeId },
    );
  },

  /** POST /stores/:storeId/order-tags */
  create(storeId: number, payload: CreateOrderTagPayload) {
    return apiClient<ApiResponse<{ tag: OrderTag }>>(
      API_ENDPOINTS.STORE.ORDER_TAGS(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  /** PATCH /stores/:storeId/order-tags/:id */
  update(storeId: number, tagId: number, payload: UpdateOrderTagPayload) {
    return apiClient<ApiResponse<{ tag: OrderTag }>>(
      API_ENDPOINTS.STORE.ORDER_TAG_BY_ID(storeId, tagId),
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },

  /** DELETE /stores/:storeId/order-tags/:id */
  delete(storeId: number, tagId: number) {
    return apiClient<ApiResponse<null>>(
      API_ENDPOINTS.STORE.ORDER_TAG_BY_ID(storeId, tagId),
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  /**
   * PUT /stores/:storeId/orders/:orderId/tags
   *
   * Replaces the order's tag set with `tagIds` in a single transaction.
   * Idempotent — repeated calls with the same `tagIds` are no-ops on the
   * second call.
   */
  replaceForOrder(storeId: number, orderId: number, tagIds: number[]) {
    return apiClient<ApiResponse<{ tags: OrderTagSummary[] }>>(
      API_ENDPOINTS.STORE.ORDER_TAGS_FOR_ORDER(storeId, orderId),
      {
        method: "PUT",
        body: { tag_ids: tagIds },
        storeId,
      },
    );
  },

  /**
   * POST /stores/:storeId/orders/bulk/tags
   *
   * Atomically adds every `(order_id, tag_id)` pair. Rejects the whole
   * request if any order would exceed `MAX_TAGS_PER_ORDER`.
   */
  bulkAdd(storeId: number, payload: BulkTagPayload) {
    return apiClient<ApiResponse<{ affected_orders: number }>>(
      API_ENDPOINTS.STORE.ORDER_TAGS_BULK(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  /**
   * DELETE /stores/:storeId/orders/bulk/tags
   *
   * Atomically removes every `(order_id, tag_id)` pair from the targeted
   * orders. The request body shape mirrors `bulkAdd`.
   */
  bulkRemove(storeId: number, payload: BulkTagPayload) {
    return apiClient<ApiResponse<{ affected_orders: number }>>(
      API_ENDPOINTS.STORE.ORDER_TAGS_BULK(storeId),
      {
        method: "DELETE",
        body: payload,
        storeId,
      },
    );
  },
};
