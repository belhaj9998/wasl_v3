/**
 * Order & Checkout Types
 */

export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "PREPARING"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELED"
  | "RETURNED";

export type PaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PARTIALLY_PAID"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PaymentMethod =
  | "CASH_ON_DELIVERY"
  | "CARD"
  | "BANK_TRANSFER"
  | "WALLET"
  | "MANUAL";

export type OrderSource =
  | "STOREFRONT"
  | "ADMIN"
  | "MANUAL"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "TIKTOK";

export interface Order {
  id: number;
  order_number: string;
  store_id: number;
  customer_id: number | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  source: OrderSource;
  subtotal: string;
  discount_amount: string;
  shipping_amount: string;
  total: string;
  currency: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  shipping_address: Address;
  payment_method: PaymentMethod;
  notes_from_customer: string | null;
  internal_notes: OrderNote[];
  items: OrderItem[];
  timeline: TimelineEvent[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_title: string;
  sku: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface OrderNote {
  id: number;
  content: string;
  actor_name: string;
  created_at: string;
}

export interface TimelineEvent {
  id: number;
  event: string;
  description: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface Address {
  full_name: string;
  city: string;
  street_line_1: string;
  street_line_2?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  type?: "SHIPPING" | "BILLING" | "OTHER";
}
