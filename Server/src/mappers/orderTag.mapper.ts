import { RawRecord, timestamp } from "./mapper.utils";

/**
 * Options for projecting an OrderTag into its DTO.
 * `assignmentCount` is populated only by the settings-page list endpoint.
 */
interface OrderTagMapOptions {
  assignmentCount?: number;
}

/**
 * Maps a full `OrderTag` row into the API DTO consumed by the settings
 * page and the tag picker. Includes `created_at` / `updated_at` as ISO
 * strings, and an optional `assignment_count` for the settings table.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 10.1
 */
export function mapOrderTagToDto(
  tag: RawRecord,
  opts?: OrderTagMapOptions,
): {
  id: number;
  name: string;
  color_preset: string;
  created_at: string | null;
  updated_at: string | null;
  assignment_count?: number;
} {
  return {
    id: tag.id,
    name: tag.name,
    color_preset: tag.color_preset,
    created_at: timestamp(tag.created_at),
    updated_at: timestamp(tag.updated_at),
    ...(opts?.assignmentCount !== undefined
      ? { assignment_count: opts.assignmentCount }
      : {}),
  };
}

/**
 * Lightweight projection embedded inside `Order.tags[]` and returned by
 * `GET /orders/:orderId/tags`. Only id/name/color_preset are surfaced —
 * timestamps stay on the dedicated tag-definition endpoints.
 *
 * Validates: Requirements 4.1
 */
export function mapOrderTagToSummaryDto(tag: RawRecord): {
  id: number;
  name: string;
  color_preset: string;
} {
  return {
    id: tag.id,
    name: tag.name,
    color_preset: tag.color_preset,
  };
}
