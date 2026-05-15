import { createAsyncThunk } from "@reduxjs/toolkit";
import { inventoryService } from "@/lib/api/services/inventory.service";
import type { AdjustInventoryPayload } from "@/lib/api/services/inventory.service";
import type { PaginationParams } from "@/types";

export const fetchInventory = createAsyncThunk(
  "inventory/fetchAll",
  async (
    { storeId, params }: { storeId: number; params?: PaginationParams },
    { rejectWithValue },
  ) => {
    try {
      const response = await inventoryService.getAll(storeId, params);
      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch inventory";
      return rejectWithValue(message);
    }
  },
);

export const fetchLowStock = createAsyncThunk(
  "inventory/fetchLowStock",
  async (
    { storeId, params }: { storeId: number; params?: PaginationParams },
    { rejectWithValue },
  ) => {
    try {
      const response = await inventoryService.getLowStock(storeId, params);
      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch low stock items";
      return rejectWithValue(message);
    }
  },
);

export const fetchInventoryMovements = createAsyncThunk(
  "inventory/fetchMovements",
  async (
    { storeId, params }: { storeId: number; params?: PaginationParams },
    { rejectWithValue },
  ) => {
    try {
      const response = await inventoryService.getMovements(storeId, params);
      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch inventory movements";
      return rejectWithValue(message);
    }
  },
);

export const adjustInventory = createAsyncThunk(
  "inventory/adjust",
  async (
    {
      storeId,
      variantId,
      payload,
    }: { storeId: number; variantId: number; payload: AdjustInventoryPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await inventoryService.adjust(
        storeId,
        variantId,
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to adjust inventory";
      return rejectWithValue(message);
    }
  },
);
