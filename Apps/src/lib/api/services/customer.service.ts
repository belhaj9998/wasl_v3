/**
 * Customer Service
 * Store-scoped customer management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
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

interface CustomerResponse {
  customer: Customer;
}

interface AddressesResponse {
  addresses: CustomerAddress[];
}

interface AddressResponse {
  address: CustomerAddress;
}

type CustomerListParams = PaginationParams & {
  status?: "ACTIVE" | "BLOCKED" | "ARCHIVED";
  sort_by?: "created_at" | "first_name" | "last_name";
  sort_order?: "asc" | "desc";
};

type CustomerAddressApi = CustomerAddress & {
  region?: string | null;
};

function normalizeAddress(address: CustomerAddressApi): CustomerAddress {
  return {
    ...address,
    state: address.state ?? address.region ?? null,
    country: address.country ?? null,
  };
}


export interface UpdateAddressPayload extends Partial<AddAddressPayload> {}

export const customerService = {
  getAll(storeId: number, params?: CustomerListParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Customer>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}${query}`,
      { storeId },
    );
  },

  getById(storeId: number, customerId: number) {
    return apiClient<ApiResponse<CustomerResponse>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}`,
      { storeId },
    ).then(
      (res) => ({ ...res, data: res.data.customer }) as ApiResponse<Customer>,
    );
  },

  create(storeId: number, payload: CreateCustomerPayload) {
    return apiClient<ApiResponse<CustomerResponse>>(
      API_ENDPOINTS.STORE.CUSTOMERS(storeId),
      {
        method: "POST",
        body: payload,
        storeId,
      },
    ).then(
      (res) => ({ ...res, data: res.data.customer }) as ApiResponse<Customer>,
    );
  },
  update(storeId: number, customerId: number, payload: UpdateCustomerPayload) {
    return apiClient<ApiResponse<CustomerResponse>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    ).then(
      (res) => ({ ...res, data: res.data.customer }) as ApiResponse<Customer>,
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
    return apiClient<ApiResponse<AddressesResponse>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}/addresses`,
      { storeId },
    ).then(
      (res) =>
        ({
          ...res,
          data: res.data.addresses.map(normalizeAddress),
        }) as ApiResponse<CustomerAddress[]>,
    );
  },
  addAddress(storeId: number, customerId: number, payload: AddAddressPayload) {
    return apiClient<ApiResponse<AddressResponse>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}/addresses`,
      {
        method: "POST",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({
          ...res,
          data: normalizeAddress(res.data.address),
        }) as ApiResponse<CustomerAddress>,
    );
  },
  updateAddress(
    storeId: number,
    customerId: number,
    addressId: number,
    payload: UpdateAddressPayload,
  ) {
    return apiClient<ApiResponse<AddressResponse>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}/addresses/${addressId}`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    ).then(
      (res) =>
        ({
          ...res,
          data: normalizeAddress(res.data.address),
        }) as ApiResponse<CustomerAddress>,
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
    return apiClient<ApiResponse<AddressResponse>>(
      `${API_ENDPOINTS.STORE.CUSTOMERS(storeId)}/${customerId}/addresses/${addressId}/set-default`,
      {
        method: "PATCH",
        storeId,
      },
    ).then(
      (res) =>
        ({
          ...res,
          data: normalizeAddress(res.data.address),
        }) as ApiResponse<CustomerAddress>,
    );
  },
};
