import { createAsyncThunk } from "@reduxjs/toolkit";
import { orderService } from "@/lib/api/services/order.service";
import type {
  AddNotePayload,
  AssignAssigneePayload,
  CreateOrderPayload,
  OrderCountsParams,
  OrderListParams,
  UpdateOrderSourcePayload,
  UpdateOrderStatusPayload,
} from "@/lib/api/services/order.service";
import type { AssignedUserSummary } from "@/types";

export const fetchOrders = createAsyncThunk(
  "orders/fetchAll",
  async (
    { storeId, params }: { storeId: number; params?: OrderListParams },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderService.getAll(storeId, params);
      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch orders";
      return rejectWithValue(message);
    }
  },
);

export const fetchOrderById = createAsyncThunk(
  "orders/fetchById",
  async (
    { storeId, orderId }: { storeId: number; orderId: number },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderService.getById(storeId, orderId);
      return response.data.order;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch order";
      return rejectWithValue(message);
    }
  },
);

export const createOrder = createAsyncThunk(
  "orders/create",
  async (
    { storeId, payload }: { storeId: number; payload: CreateOrderPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderService.create(storeId, payload);
      return response.data.order;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create order";
      return rejectWithValue(message);
    }
  },
);

export const updateOrderStatus = createAsyncThunk(
  "orders/updateStatus",
  async (
    {
      storeId,
      orderId,
      payload,
    }: { storeId: number; orderId: number; payload: UpdateOrderStatusPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderService.updateStatus(
        storeId,
        orderId,
        payload,
      );
      return response.data.order;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update order status";
      return rejectWithValue(message);
    }
  },
);

export const updateOrderSource = createAsyncThunk(
  "orders/updateSource",
  async (
    {
      storeId,
      orderId,
      payload,
    }: {
      storeId: number;
      orderId: number;
      payload: UpdateOrderSourcePayload;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderService.updateOrderSource(
        storeId,
        orderId,
        payload,
      );
      return response.data.order;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update order source";
      return rejectWithValue(message);
    }
  },
);

export const cancelOrder = createAsyncThunk(
  "orders/cancel",
  async (
    {
      storeId,
      orderId,
      reason,
    }: { storeId: number; orderId: number; reason?: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderService.cancel(storeId, orderId, reason);
      return response.data.order;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel order";
      return rejectWithValue(message);
    }
  },
);

export const addOrderNote = createAsyncThunk(
  "orders/addNote",
  async (
    {
      storeId,
      orderId,
      payload,
    }: { storeId: number; orderId: number; payload: AddNotePayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderService.addNote(storeId, orderId, payload);
      const timeline = response.data.timeline;
      return {
        orderId,
        note: {
          id: timeline.id,
          content: timeline.note ?? timeline.description ?? "",
          actor_name: timeline.actor_name,
          created_at: timeline.created_at,
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to add note";
      return rejectWithValue(message);
    }
  },
);

/**
 * Assign, reassign, or unassign the responsible staff member on an order.
 *
 * The `optimisticAssignee` argument is the resolved AssignedUserSummary the UI
 * wants to show immediately (the eligible-assignee object for `payload.user_id`,
 * or `null` for unassign). It is consumed by the `pending` reducer for the
 * optimistic update; the thunk body itself only performs the network call and
 * returns the authoritative server-side Order (with its `assigned_user` and
 * `timeline`).
 */
export const assignOrderAssignee = createAsyncThunk(
  "orders/assignAssignee",
  async (
    {
      storeId,
      orderId,
      payload,
    }: {
      storeId: number;
      orderId: number;
      payload: AssignAssigneePayload;
      optimisticAssignee?: AssignedUserSummary | null;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderService.assignAssignee(
        storeId,
        orderId,
        payload,
      );
      return response.data.order;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to assign order";
      return rejectWithValue(message);
    }
  },
);

export const fetchOrderCounts = createAsyncThunk(
  "orders/fetchCounts",
  async (
    { storeId, params }: { storeId: number; params?: OrderCountsParams },
    { rejectWithValue },
  ) => {
    try {
      const response = await orderService.getCounts(storeId, params);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch order counts";
      return rejectWithValue(message);
    }
  },
);

export const fetchOrderKpis = createAsyncThunk(
  "orders/fetchKpis",
  async ({ storeId }: { storeId: number }, { rejectWithValue }) => {
    try {
      const response = await orderService.getKpis(storeId);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch order KPIs";
      return rejectWithValue(message);
    }
  },
);
