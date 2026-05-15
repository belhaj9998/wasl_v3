/**
 * Customer Service
 * Store-scoped customer management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  Address,
  ApiResponse,
  Customer,
  CustomerAddress,
  Order,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

export interface CreateCustomerPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  status?: "ACTIVE" | "BLOCKED" | "ARCHIVED";
  gender?: string;
  birth_date?: string;
  accepts_marketing?: boolean;
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {}

export interface AddAddressPayload {
  full_name: string;
  city: string;
  street_line_1: string;
  street_line_2?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  type?: "SHIPPING" | "BILLING" | "OTHER";
  is_default?: boolean;
}

export interface UpdateAddressPayload extends Partial<AddAddressPayload> {}

export const customerService = {
  getAll(storeId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Customer>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, customerId: number) {
    return apiClient<ApiResponse<Customer>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}`,
      { storeId },
    );
  },

  create(storeId: number, payload: CreateCustomerPayload) {
    return apiClient<ApiResponse<Customer>>(
      API_ENDPOINTS.STORE.CUSTOMERS(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  update(storeId: number, customerId: number, payload: UpdateCustomerPayload) {
    return apiClient<ApiResponse<Customer>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },

  delete(storeId: number, customerId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  getOrders(storeId: number, customerId: number, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Order>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}/orders${query}`,
      { storeId },
    );
  },

  getAddresses(storeId: number, customerId: number) {
    return apiClient<ApiResponse<CustomerAddress[]>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}/addresses`,
      { storeId },
    );
  },

  addAddress(storeId: number, customerId: number, payload: AddAddressPayload) {
    return apiClient<ApiResponse<CustomerAddress>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}/addresses`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    );
  },

  updateAddress(
    storeId: number,
    customerId: number,
    addressId: number,
    payload: UpdateAddressPayload,
  ) {
    return apiClient<ApiResponse<CustomerAddress>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}/addresses/${addressId}`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },

  deleteAddress(storeId: number, customerId: number, addressId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}/addresses/${addressId}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },

  setDefaultAddress(storeId: number, customerId: number, addressId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}/addresses/${addressId}/default`,
      {
        method: "PATCH",
        storeId,
      },
    );
  },
};
