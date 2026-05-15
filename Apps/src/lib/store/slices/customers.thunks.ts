import { createAsyncThunk } from "@reduxjs/toolkit";
import { customerService } from "@/lib/api/services/customer.service";
import type {
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from "@/lib/api/services/customer.service";
import type { PaginationParams } from "@/types";

export const fetchCustomers = createAsyncThunk(
  "customers/fetchAll",
  async (
    { storeId, params }: { storeId: number; params?: PaginationParams },
    { rejectWithValue },
  ) => {
    try {
      const response = await customerService.getAll(storeId, params);
      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch customers";
      return rejectWithValue(message);
    }
  },
);

export const fetchCustomerById = createAsyncThunk(
  "customers/fetchById",
  async (
    { storeId, customerId }: { storeId: number; customerId: number },
    { rejectWithValue },
  ) => {
    try {
      const response = await customerService.getById(storeId, customerId);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch customer";
      return rejectWithValue(message);
    }
  },
);

export const createCustomer = createAsyncThunk(
  "customers/create",
  async (
    { storeId, payload }: { storeId: number; payload: CreateCustomerPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await customerService.create(storeId, payload);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create customer";
      return rejectWithValue(message);
    }
  },
);

export const updateCustomer = createAsyncThunk(
  "customers/update",
  async (
    {
      storeId,
      customerId,
      payload,
    }: { storeId: number; customerId: number; payload: UpdateCustomerPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await customerService.update(
        storeId,
        customerId,
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update customer";
      return rejectWithValue(message);
    }
  },
);

export const deleteCustomer = createAsyncThunk(
  "customers/delete",
  async (
    { storeId, customerId }: { storeId: number; customerId: number },
    { rejectWithValue },
  ) => {
    try {
      await customerService.delete(storeId, customerId);
      return customerId;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete customer";
      return rejectWithValue(message);
    }
  },
);
