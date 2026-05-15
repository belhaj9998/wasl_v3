import { createAsyncThunk } from "@reduxjs/toolkit";
import { couponService } from "@/lib/api/services/coupon.service";
import type {
  CreateCouponPayload,
  UpdateCouponPayload,
} from "@/lib/api/services/coupon.service";
import type { PaginationParams } from "@/types";

export const fetchCoupons = createAsyncThunk(
  "coupons/fetchAll",
  async (
    { storeId, params }: { storeId: number; params?: PaginationParams },
    { rejectWithValue },
  ) => {
    try {
      const response = await couponService.getAll(storeId, params);
      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch coupons";
      return rejectWithValue(message);
    }
  },
);

export const fetchCouponById = createAsyncThunk(
  "coupons/fetchById",
  async (
    { storeId, couponId }: { storeId: number; couponId: number },
    { rejectWithValue },
  ) => {
    try {
      const response = await couponService.getById(storeId, couponId);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch coupon";
      return rejectWithValue(message);
    }
  },
);

export const createCoupon = createAsyncThunk(
  "coupons/create",
  async (
    { storeId, payload }: { storeId: number; payload: CreateCouponPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await couponService.create(storeId, payload);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create coupon";
      return rejectWithValue(message);
    }
  },
);

export const updateCoupon = createAsyncThunk(
  "coupons/update",
  async (
    {
      storeId,
      couponId,
      payload,
    }: { storeId: number; couponId: number; payload: UpdateCouponPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await couponService.update(storeId, couponId, payload);
      return response.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update coupon";
      return rejectWithValue(message);
    }
  },
);

export const deleteCoupon = createAsyncThunk(
  "coupons/delete",
  async (
    { storeId, couponId }: { storeId: number; couponId: number },
    { rejectWithValue },
  ) => {
    try {
      await couponService.delete(storeId, couponId);
      return couponId;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete coupon";
      return rejectWithValue(message);
    }
  },
);
