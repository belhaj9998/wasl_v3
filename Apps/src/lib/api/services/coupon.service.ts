/**
 * Coupon Service
 * Store-scoped coupon management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ApiResponse,
  Coupon,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

export interface CreateCouponPayload {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minimum_order_amount?: number;
  maximum_discount_amount?: number;
  usage_limit?: number;
  usage_limit_per_customer?: number;
  starts_at?: string;
  ends_at?: string;
  is_active?: boolean;
}

export interface UpdateCouponPayload extends Partial<CreateCouponPayload> {}

export interface CouponUsage {
  id: number;
  order_id: number;
  customer_id: number | null;
  discount_amount: string;
  used_at: string;
}

export interface ValidateCouponPayload {
  code: string;
  order_total: number;
}

export interface ValidateCouponResult {
  valid: boolean;
  discount_amount: string;
  coupon: Coupon;
}

export const couponService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Coupon>>(
      `${API_ENDPOINTS.STORE.COUPONS(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, couponId: number) {
    return apiClient<ApiResponse<Coupon>>(
      `${API_ENDPOINTS.STORE.COUPONS(storeId)}/${couponId}`,
      { storeId },
    );
  },

  create(storeId: number, payload: CreateCouponPayload) {
    return apiClient<ApiResponse<Coupon>>(
      API_ENDPOINTS.STORE.COUPONS(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  update(storeId: number, couponId: number, payload: UpdateCouponPayload) {
    return apiClient<ApiResponse<Coupon>>(
      `${API_ENDPOINTS.STORE.COUPONS(storeId)}/${couponId}`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },

  delete(storeId: number, couponId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.COUPONS(storeId)}/${couponId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  getUsages(storeId: number, couponId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<CouponUsage>>(
      `${API_ENDPOINTS.STORE.COUPONS(storeId)}/${couponId}/usages${query}`,
      { storeId },
    );
  },

  validate(storeId: number, payload: ValidateCouponPayload) {
    return apiClient<ApiResponse<ValidateCouponResult>>(
      `${API_ENDPOINTS.STORE.COUPONS(storeId)}/validate`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },
};
