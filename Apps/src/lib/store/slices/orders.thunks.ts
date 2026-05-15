import { createAsyncThunk } from "@reduxjs/toolkit";
import { orderService } from "@/lib/api/services/order.service";
import type {
  AddNotePayload,
  CreateOrderPayload,
  UpdateOrderStatusPayload,
} from "@/lib/api/services/order.service";
import type { PaginationParams } from "@/types";

export const fetchOrders = createAsyncThunk(
  "orders/fetchAll",
  async (
    { storeId, params }: { storeId: number; params?: PaginationParams },
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
      return response.data;
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
      return response.data;
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
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update order status";
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
      return response.data;
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
      return { orderId, note: response.data };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to add note";
      return rejectWithValue(message);
    }
  },
);
