/**
 * Global / Shared Types
 * Cart, UI, and cross-cutting concerns
 */

import type { ProductMedia } from "./product.types";

export interface Cart {
  id: number;
  items: CartItem[];
  subtotal: string;
  discount_amount: string;
  total: string;
  coupon: AppliedCoupon | null;
  item_count: number;
}

export interface CartItem {
  id: number;
  product_id: number;
  variant_id: number;
  quantity: number;
  unit_price: string;
  total_price: string;
  product: {
    name: string;
    slug: string;
    media: ProductMedia[];
  };
  variant: {
    title: string;
    sku: string;
  };
}

export interface AppliedCoupon {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  discount_amount: string;
}

export interface SidebarItem {
  path: string;
  label: string;
  icon: string;
  permission: string;
}

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}
