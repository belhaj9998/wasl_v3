/**
 * Order Tag Thunks
 *
 * Async actions wrapping `orderTagService` for the `orderTags` slice. Only
 * the definition-CRUD thunks (`fetchOrderTags`, `createOrderTag`, ...) update
 * the `tags` cache in the slice; assignment thunks (`replaceOrderTagsForOrder`,
 * `bulkAddOrderTags`, `bulkRemoveOrderTags`) intentionally leave the cache
 * untouched — order-level updates flow through the existing `orders.slice`
 * via re-fetches (`fetchOrderById`, `fetchOrders`) by the calling components.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { orderTagService } from "@/lib/api/services/orderTag.service";
import type {
  BulkTagPayload,
  CreateOrderTagPayload,
  OrderTag,
  OrderTagSummary,
  UpdateOrderTagPayload,
} from "@/types/orderTag.types";

export const fetchOrderTags = createAsyncThunk(
  "orderTags/fetchAll",
  async (
    { storeId, withCounts }: { storeId: number; withCounts?: boolean },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderTagService.list(storeId, withCounts);
      return {
        tags: response.data.tags,
        countsLoaded: Boolean(withCounts),
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch order tags";
      return rejectWithValue(message);
    }
  },
);

export const createOrderTag = createAsyncThunk(
  "orderTags/create",
  async (
    { storeId, payload }: { storeId: number; payload: CreateOrderTagPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderTagService.create(storeId, payload);
      return response.data.tag;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create order tag";
      return rejectWithValue(message);
    }
  },
);

export const updateOrderTag = createAsyncThunk(
  "orderTags/update",
  async (
    {
      storeId,
      tagId,
      payload,
    }: { storeId: number; tagId: number; payload: UpdateOrderTagPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderTagService.update(storeId, tagId, payload);
      return response.data.tag;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update order tag";
      return rejectWithValue(message);
    }
  },
);

export const deleteOrderTag = createAsyncThunk(
  "orderTags/delete",
  async (
    { storeId, tagId }: { storeId: number; tagId: number },
    { rejectWithValue },
  ) => {
    try {
      await orderTagService.delete(storeId, tagId);
      return tagId;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete order tag";
      return rejectWithValue(message);
    }
  },
);

/**
 * PUT /orders/:orderId/tags
 *
 * The slice does not own per-order tag state, so this thunk returns the
 * fresh tag list and the `orderId` for callers to plug into `orders.slice`
 * (typically by triggering `fetchOrderById` or by patching `currentOrder`
 * in their own component-local handler).
 */
export const replaceOrderTagsForOrder = createAsyncThunk<
  { orderId: number; tags: OrderTagSummary[] },
  { storeId: number; orderId: number; tagIds: number[] },
  { rejectValue: string }
>(
  "orderTags/replaceForOrder",
  async ({ storeId, orderId, tagIds }, { rejectWithValue }) => {
    try {
      const response = await orderTagService.replaceForOrder(
        storeId,
        orderId,
        tagIds,
      );
      return { orderId, tags: response.data.tags };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update order tags";
      return rejectWithValue(message);
    }
  },
);

export const bulkAddOrderTags = createAsyncThunk<
  { affected_orders: number },
  { storeId: number; payload: BulkTagPayload },
  { rejectValue: string }
>("orderTags/bulkAdd", async ({ storeId, payload }, { rejectWithValue }) => {
  try {
    const response = await orderTagService.bulkAdd(storeId, payload);
    return response.data;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to bulk-add tags";
    return rejectWithValue(message);
  }
});

export const bulkRemoveOrderTags = createAsyncThunk<
  { affected_orders: number },
  { storeId: number; payload: BulkTagPayload },
  { rejectValue: string }
>("orderTags/bulkRemove", async ({ storeId, payload }, { rejectWithValue }) => {
  try {
    const response = await orderTagService.bulkRemove(storeId, payload);
    return response.data;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to bulk-remove tags";
    return rejectWithValue(message);
  }
});

// Re-export the OrderTag type for convenience to slice consumers.
export type { OrderTag };
