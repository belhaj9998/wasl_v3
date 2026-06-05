/**
 * Order & Checkout Types
 */

import type { OrderTagSummary } from "./orderTag.types";
import type { AssignedUserSummary } from "./assignee.types";

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
  | "WHATSAPP"
  | "PHONE"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "TIKTOK"
  | "OTHER";

export interface Order {
  id: number;
  order_number: string;
  store_id: number;
  customer_id: number | null;
  cart_id: number | null;
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
  shipping_address: Address | null;
  payment_method: PaymentMethod | null;
  notes_from_customer: string | null;
  internal_notes: OrderNote[];
  items: OrderItem[];
  timeline: TimelineEvent[];
  /**
   * Tags assigned to this order, sorted ascending by tag `created_at`.
   * Always present; an empty array indicates no tags are assigned.
   */
  tags: OrderTagSummary[];
  /** The current assignee, or null when the order is unassigned. */
  assigned_user: AssignedUserSummary | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_title: string | null;
  sku: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  product_image?: string | null;
}

export interface OrderNote {
  id: number;
  content: string;
  actor_name: string | null;
  created_at: string;
}

export interface TimelineEvent {
  id: number;
  event: string;
  description: string | null;
  note?: string | null;
  from_status?: OrderStatus | null;
  to_status?: OrderStatus | null;
  actor_name: string | null;
  actor_user_id?: number | null;
  payload?: unknown;
  created_at: string;
}

export interface SourceChangedTimelinePayload {
  from: OrderSource;
  to: OrderSource;
}

export interface Address {
  id?: number;
  type?: "SHIPPING" | "BILLING" | "OTHER";
  full_name: string;
  phone?: string | null;
  city: string;
  street_line_1: string;
  street_line_2?: string | null;
  region?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  google_maps_url?: string | null;
}
