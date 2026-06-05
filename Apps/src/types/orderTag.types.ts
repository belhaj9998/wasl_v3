/**
 * Order Tag Types
 *
 * Domain types for the Order Tags feature. Tags are user-defined labels that
 * a store admin can attach to orders for workflow flagging, segmentation, and
 * filtering. Each store maintains its own vocabulary; tags are tenant-isolated
 * by `store_id` on the backend.
 */

/**
 * Fixed palette of color preset identifiers shared between backend and
 * frontend. Mapped to Tailwind classes at the UI layer (see
 * `lib/constants/orderTagColors.ts`); never accept free-form hex input.
 */
export type OrderTagColorPreset =
  | "slate"
  | "gray"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "green"
  | "emerald"
  | "teal"
  | "sky"
  | "blue"
  | "indigo"
  | "purple"
  | "pink";

/**
 * Full tag DTO returned by `/order-tags` and `/order-tags/:id` endpoints.
 * `assignment_count`, `created_at`, and `updated_at` are populated only by
 * specific endpoints (e.g., the settings page list with `with_counts=true`).
 */
export interface OrderTag {
  id: number;
  name: string;
  color_preset: OrderTagColorPreset;
  assignment_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Lightweight tag shape embedded inside `Order.tags[]` and returned by the
 * tag-assignment endpoints. Excludes timestamps and counts to keep order
 * payloads compact.
 */
export interface OrderTagSummary {
  id: number;
  name: string;
  color_preset: OrderTagColorPreset;
}

export interface CreateOrderTagPayload {
  name: string;
  color_preset: OrderTagColorPreset;
}

export interface UpdateOrderTagPayload {
  name?: string;
  color_preset?: OrderTagColorPreset;
}

/**
 * Payload for bulk add/remove endpoints. Both fields are required and must
 * contain at least one positive integer; the backend additionally enforces
 * upper bounds (500 orders, 50 tags) per request.
 */
export interface BulkTagPayload {
  order_ids: number[];
  tag_ids: number[];
}
