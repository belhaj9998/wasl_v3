/**
 * Store, Subscription, Coupon, Customer & Inventory Types
 */

export type StoreStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export interface Store {
  id: number;
  name: string;
  domain: string;
  status: StoreStatus;
  owner_id: number;
  logo_url: string | null;
  favicon_url: string | null;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  support_email: string | null;
  support_phone: string | null;
  social_links: Record<string, string> | null;
  owner?: { id: number; name: string; email: string };
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: number;
  code: string;
  name: string;
  price_monthly: string;
  price_yearly: string | null;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED";

export type BillingCycle = "MONTHLY" | "YEARLY";

export interface Subscription {
  id: number;
  store_id: number;
  plan_id: number;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  plan?: Plan;
  store?: Store;
}

export type CustomerStatus = "ACTIVE" | "BLOCKED" | "ARCHIVED";

export interface Customer {
  id: number;
  store_id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  status: CustomerStatus;
  gender: string | null;
  birth_date: string | null;
  notes: string | null;
  total_orders: number;
  total_spent: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomerAddress {
  id: number;
  customer_id: number;
  full_name: string;
  city: string;
  street_line_1: string;
  street_line_2: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  type: "SHIPPING" | "BILLING" | "OTHER";
  is_default: boolean;
  created_at: string;
}

export interface Coupon {
  id: number;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
  usage_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InventoryLevel {
  variant_id: number;
  available_quantity: number;
  total_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
}

export type InventoryMovementType =
  | "IN"
  | "ADJUSTMENT_IN"
  | "OUT"
  | "ADJUSTMENT_OUT"
  | "RESERVED"
  | "RELEASED"
  | "RETURNED";

export interface InventoryMovement {
  id: number;
  variant_id: number;
  type: InventoryMovementType;
  quantity_change: number;
  reason: string | null;
  created_at: string;
  variant?: {
    id: number;
    title: string;
    sku: string;
    product: {
      id: number;
      name: string;
    };
  };
  actor?: {
    id: number;
    name: string;
    email: string;
  };
}
