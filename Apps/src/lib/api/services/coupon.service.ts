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
  subtotal: number;
  customer_id?: number | null;
}

interface CouponResponse {
  coupon: Coupon;
}

type CouponListParams = PaginationParams & {
  search?: string;
  is_active?: boolean;
  type?: "PERCENTAGE" | "FIXED";
  sort_by?: "created_at" | "code" | "starts_at" | "ends_at";
  sort_order?: "asc" | "desc";
};

export interface ValidateCouponResult {
  valid: boolean;
  discount_amount: number;
  coupon: Coupon;
}

export const couponService = {
  getAll(storeId: number, params?: CouponListParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Coupon>>(
      `${API_ENDPOINTS.STORE.COUPONS(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, couponId: number) {
    return apiClient<ApiResponse<CouponResponse>>(
      `${API_ENDPOINTS.STORE.COUPONS(storeId)}/${couponId}`,
      { storeId },
    ).then((res) => ({ ...res, data: res.data.coupon }) as ApiResponse<Coupon>);
  },

  create(storeId: number, payload: CreateCouponPayload) {
    return apiClient<ApiResponse<CouponResponse>>(
      API_ENDPOINTS.STORE.COUPONS(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    ).then((res) => ({ ...res, data: res.data.coupon }) as ApiResponse<Coupon>);
  },
  update(storeId: number, couponId: number, payload: UpdateCouponPayload) {
    return apiClient<ApiResponse<CouponResponse>>(
      `${API_ENDPOINTS.STORE.COUPONS(storeId)}/${couponId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    ).then((res) => ({ ...res, data: res.data.coupon }) as ApiResponse<Coupon>);
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
