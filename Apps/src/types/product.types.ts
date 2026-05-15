/**
 * Product & Catalog Types
 */

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  status: ProductStatus;
  base_price: string;
  compare_at_price: string | null;
  cost_price: string | null;
  track_inventory: boolean;
  has_variants: boolean;
  is_published: boolean;
  published_at: string | null;
  categories?: Category[];
  media?: ProductMedia[];
  variants?: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  title: string;
  sku: string;
  barcode: string | null;
  price: string | null;
  compare_at_price: string | null;
  is_default: boolean;
  is_active: boolean;
  option_values?: OptionValue[];
  inventory?: import("./store.types").InventoryLevel;
}

export interface ProductOption {
  id: number;
  name: string;
  position: number;
  values: OptionValue[];
}

export interface OptionValue {
  id: number;
  value: string;
  position: number;
}

export interface ProductMedia {
  id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
  product_count?: number;
}
