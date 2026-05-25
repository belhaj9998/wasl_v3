/**
 * Storefront Service
 * Public and customer-facing storefront operations.
 * All methods accept a `domain` string for URL construction.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  Address,
  ApiResponse,
  Cart,
  Category,
  Customer,
  Order,
  PaginatedResponse,
  PaginationParams,
  Product,
  Store,
} from "@/types";

// --- Payload types ---

export interface AddToCartPayload {
  product_id: number;
  variant_id: number;
  quantity: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

export interface ApplyCouponPayload {
  code: string;
}

export interface CheckoutPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  shipping_address: {
    full_name: string;
    city: string;
    street_line_1: string;
    street_line_2?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  payment_method: string;
  notes_from_customer?: string;
}

export interface OrderLookupPayload {
  order_number: string;
  phone: string;
}

export interface CustomerRegisterPayload {
  customer_name: string;
  phone: string;
  password: string;
}

export interface CustomerLoginPayload {
  phone: string;
  password: string;
}

export interface UpdateCustomerProfilePayload {
  customer_name?: string;
  phone?: string;
}

export interface CustomerAddressPayload {
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

export interface CustomerAuthResponse {
  customer: Customer;
  token: string;
}
interface CustomerProfileResponse {
  customer: Customer;
}

interface CustomerAddressResponse {
  address: Address;
}
interface StoreInfoResponse {
  store: Store;
}

interface CategoriesResponse {
  categories: Category[];
}
// --- Service ---
interface ProductResponse {
  product: Product;
}

interface CartResponse {
  cart: Cart & {
    discount_total?: string;
    shipping_total?: string;
    grand_total?: string;
  };
}

interface CheckoutResponse {
  order: Order;
  payment_link: string | null;
  client_secret: string | null;
}

export interface StorefrontOrderLookupItem {
  id: number;
  product_name: string;
  variant_title: string | null;
  sku: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface StorefrontOrderLookupAddress {
  id: number;
  type: string;
  full_name: string;
  phone: string | null;
  city: string;
  region: string | null;
  street_line_1: string;
  street_line_2: string | null;
  postal_code: string | null;
  google_maps_url: string | null;
}

export interface StorefrontOrderLookupTimelineEvent {
  id: number;
  event: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
}

export interface StorefrontOrderLookup {
  order_number: string;
  status: string;
  payment_status: string;
  currency_code: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  grand_total: string;
  placed_at: string | null;
  items: StorefrontOrderLookupItem[];
  addresses: StorefrontOrderLookupAddress[];
  timeline: StorefrontOrderLookupTimelineEvent[];
}

interface OrderLookupResponse {
  order: StorefrontOrderLookup;
}
export const storefrontService = {
  // Store info
  getStore(domain: string) {
    return apiClient<ApiResponse<StoreInfoResponse>>(
      API_ENDPOINTS.STOREFRONT.STORE_INFO(domain),
    );
  },

  // Categories
  getCategories(domain: string) {
    return apiClient<ApiResponse<CategoriesResponse>>(
      API_ENDPOINTS.STOREFRONT.CATEGORIES(domain),
    );
  },

  getCategoryBySlug(domain: string, slug: string) {
    return apiClient<ApiResponse<Category>>(
      `${API_ENDPOINTS.STOREFRONT.CATEGORIES(domain)}/${slug}`,
    );
  },

  // Products
  getProducts(domain: string, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Product>>(
      `${API_ENDPOINTS.STOREFRONT.PRODUCTS(domain)}${query}`,
    );
  },

  searchProducts(domain: string, query: string, params?: PaginationParams) {
    const searchParams = new URLSearchParams({
      query,
      ...(params as Record<string, string>),
    });
    return apiClient<PaginatedResponse<Product>>(
      `${API_ENDPOINTS.STOREFRONT.PRODUCTS(domain)}/search?${searchParams.toString()}`,
    );
  },

  getProductBySlug(domain: string, slug: string) {
    return apiClient<ApiResponse<ProductResponse>>(
      `${API_ENDPOINTS.STOREFRONT.PRODUCTS(domain)}/${slug}`,
    );
  },

  // Cart
  getCart(domain: string) {
    return apiClient<ApiResponse<CartResponse>>(
      API_ENDPOINTS.STOREFRONT.CART(domain),
    );
  },

  addToCart(domain: string, payload: AddToCartPayload) {
    return apiClient<ApiResponse<CartResponse>>(
      API_ENDPOINTS.STOREFRONT.CART_ITEMS(domain),
      {
        method: "POST",
        body: payload,
      },
    );
  },

  updateCartItem(
    domain: string,
    itemId: number,
    payload: UpdateCartItemPayload,
  ) {
    return apiClient<ApiResponse<CartResponse>>(
      `${API_ENDPOINTS.STOREFRONT.CART_ITEMS(domain)}/${itemId}`,
      {
        method: "PATCH",
        body: payload,
      },
    );
  },

  removeCartItem(domain: string, itemId: number) {
    return apiClient<ApiResponse<CartResponse>>(
      `${API_ENDPOINTS.STOREFRONT.CART_ITEMS(domain)}/${itemId}`,
      { method: "DELETE" },
    );
  },

  // Coupon
  applyCoupon(domain: string, payload: ApplyCouponPayload) {
    return apiClient<ApiResponse<CartResponse>>(
      API_ENDPOINTS.STOREFRONT.COUPON_APPLY(domain),
      {
        method: "POST",
        body: payload,
      },
    );
  },

  removeCoupon(domain: string) {
    return apiClient<ApiResponse<CartResponse>>(
      API_ENDPOINTS.STOREFRONT.COUPON_REMOVE(domain),
      { method: "DELETE" },
    );
  },

  // Checkout
  checkout(domain: string, payload: CheckoutPayload) {
    return apiClient<ApiResponse<CheckoutResponse>>(
      API_ENDPOINTS.STOREFRONT.CHECKOUT(domain),
      {
        method: "POST",
        body: payload,
      },
    );
  },

  // Order lookup
  orderLookup(domain: string, payload: OrderLookupPayload) {
    const searchParams = new URLSearchParams({
      order_number: payload.order_number,
      verification_value: payload.phone,
    });

    return apiClient<ApiResponse<OrderLookupResponse>>(
      `${API_ENDPOINTS.STOREFRONT.ORDER_LOOKUP(domain)}?${searchParams.toString()}`,
    );
  },
  // Customer auth
  customerRegister(domain: string, payload: CustomerRegisterPayload) {
    return apiClient<ApiResponse<CustomerAuthResponse>>(
      API_ENDPOINTS.STOREFRONT.CUSTOMERS.REGISTER(domain),
      {
        method: "POST",
        body: payload,
      },
    );
  },

  customerLogin(domain: string, payload: CustomerLoginPayload) {
    return apiClient<ApiResponse<CustomerAuthResponse>>(
      API_ENDPOINTS.STOREFRONT.CUSTOMERS.LOGIN(domain),
      {
        method: "POST",
        body: payload,
      },
    );
  },

  // Customer profile
  getCustomerProfile(domain: string) {
    return apiClient<ApiResponse<CustomerProfileResponse>>(
      API_ENDPOINTS.STOREFRONT.CUSTOMERS.ME(domain),
    ).then(
      (res) => ({ ...res, data: res.data.customer }) as ApiResponse<Customer>,
    );
  },

  updateCustomerProfile(domain: string, payload: UpdateCustomerProfilePayload) {
    return apiClient<ApiResponse<CustomerProfileResponse>>(
      API_ENDPOINTS.STOREFRONT.CUSTOMERS.ME(domain),
      {
        method: "PATCH",
        body: payload,
      },
    ).then(
      (res) => ({ ...res, data: res.data.customer }) as ApiResponse<Customer>,
    );
  },
  // Customer orders
  getCustomerOrders(domain: string, params?: PaginationParams) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Order>>(
      `${API_ENDPOINTS.STOREFRONT.CUSTOMERS.ORDERS(domain)}${query}`,
    );
  },

  // Customer addresses
  getCustomerAddresses(domain: string) {
    return apiClient<ApiResponse<Address[]>>(
      API_ENDPOINTS.STOREFRONT.CUSTOMERS.ADDRESSES(domain),
    );
  },

  addCustomerAddress(domain: string, payload: CustomerAddressPayload) {
    return apiClient<ApiResponse<CustomerAddressResponse>>(
      API_ENDPOINTS.STOREFRONT.CUSTOMERS.ADDRESSES(domain),
      {
        method: "POST",
        body: payload,
      },
    ).then(
      (res) => ({ ...res, data: res.data.address }) as ApiResponse<Address>,
    );
  },

  updateCustomerAddress(
    domain: string,
    addressId: number,
    payload: Partial<CustomerAddressPayload>,
  ) {
    return apiClient<ApiResponse<Address>>(
      `${API_ENDPOINTS.STOREFRONT.CUSTOMERS.ADDRESSES(domain)}/${addressId}`,
      {
        method: "PUT",
        body: payload,
      },
    );
  },

  deleteCustomerAddress(domain: string, addressId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STOREFRONT.CUSTOMERS.ADDRESSES(domain)}/${addressId}`,
      { method: "DELETE" },
    );
  },

  setDefaultAddress(domain: string, addressId: number) {
    return apiClient<ApiResponse<null>>(
      `${API_ENDPOINTS.STOREFRONT.CUSTOMERS.ADDRESSES(domain)}/${addressId}/default`,
      { method: "PATCH" },
    );
  },
};
