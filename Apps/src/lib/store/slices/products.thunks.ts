import { createAsyncThunk } from "@reduxjs/toolkit";
import { productService } from "@/lib/api/services/product.service";
import type {
  CreateProductPayload,
  UpdateProductPayload,
} from "@/lib/api/services/product.service";
import type { PaginationParams, ProductStatus } from "@/types";

export const fetchProducts = createAsyncThunk(
  "products/fetchAll",
  async (
    { storeId, params }: { storeId: number; params?: PaginationParams },
    { rejectWithValue },
  ) => {
    try {
      const response = await productService.getAll(storeId, params);
      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch products";
      return rejectWithValue(message);
    }
  },
);

export const fetchProductById = createAsyncThunk(
  "products/fetchById",
  async (
    { storeId, productId }: { storeId: number; productId: number },
    { rejectWithValue },
  ) => {
    try {
      const response = await productService.getById(storeId, productId);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch product";
      return rejectWithValue(message);
    }
  },
);

export const createProduct = createAsyncThunk(
  "products/create",
  async (
    { storeId, payload }: { storeId: number; payload: CreateProductPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await productService.create(storeId, payload);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create product";
      return rejectWithValue(message);
    }
  },
);

export const updateProduct = createAsyncThunk(
  "products/update",
  async (
    {
      storeId,
      productId,
      payload,
    }: { storeId: number; productId: number; payload: UpdateProductPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await productService.update(storeId, productId, payload);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update product";
      return rejectWithValue(message);
    }
  },
);

export const deleteProduct = createAsyncThunk(
  "products/delete",
  async (
    { storeId, productId }: { storeId: number; productId: number },
    { rejectWithValue },
  ) => {
    try {
      await productService.delete(storeId, productId);
      return productId;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete product";
      return rejectWithValue(message);
    }
  },
);

export const changeProductStatus = createAsyncThunk(
  "products/changeStatus",
  async (
    {
      storeId,
      productId,
      status,
    }: { storeId: number; productId: number; status: ProductStatus },
    { rejectWithValue },
  ) => {
    try {
      const response = await productService.changeStatus(
        storeId,
        productId,
        status,
      );
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to change product status";
      return rejectWithValue(message);
    }
  },
);
