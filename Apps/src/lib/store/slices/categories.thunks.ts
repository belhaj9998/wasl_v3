import { createAsyncThunk } from "@reduxjs/toolkit";
import { categoryService } from "@/lib/api/services/category.service";
import type {
  CreateCategoryPayload,
  ReorderPayload,
  UpdateCategoryPayload,
} from "@/lib/api/services/category.service";
import type { PaginationParams } from "@/types";

export const fetchCategories = createAsyncThunk(
  "categories/fetchAll",
  async (
    { storeId, params }: { storeId: number; params?: PaginationParams },
    { rejectWithValue },
  ) => {
    try {
      const response = await categoryService.getAll(storeId, params);
      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch categories";
      return rejectWithValue(message);
    }
  },
);

export const fetchCategoryById = createAsyncThunk(
  "categories/fetchById",
  async (
    { storeId, categoryId }: { storeId: number; categoryId: number },
    { rejectWithValue },
  ) => {
    try {
      const response = await categoryService.getById(storeId, categoryId);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch category";
      return rejectWithValue(message);
    }
  },
);

export const createCategory = createAsyncThunk(
  "categories/create",
  async (
    { storeId, payload }: { storeId: number; payload: CreateCategoryPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await categoryService.create(storeId, payload);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create category";
      return rejectWithValue(message);
    }
  },
);

export const updateCategory = createAsyncThunk(
  "categories/update",
  async (
    {
      storeId,
      categoryId,
      payload,
    }: { storeId: number; categoryId: number; payload: UpdateCategoryPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await categoryService.update(
        storeId,
        categoryId,
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update category";
      return rejectWithValue(message);
    }
  },
);

export const deleteCategory = createAsyncThunk(
  "categories/delete",
  async (
    { storeId, categoryId }: { storeId: number; categoryId: number },
    { rejectWithValue },
  ) => {
    try {
      await categoryService.delete(storeId, categoryId);
      return categoryId;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete category";
      return rejectWithValue(message);
    }
  },
);

export const reorderCategories = createAsyncThunk(
  "categories/reorder",
  async (
    { storeId, payload }: { storeId: number; payload: ReorderPayload },
    { rejectWithValue },
  ) => {
    try {
      await categoryService.reorder(storeId, payload);
      return payload.items;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to reorder categories";
      return rejectWithValue(message);
    }
  },
);
