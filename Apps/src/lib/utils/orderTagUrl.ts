/**
 * URL state utilities for the orders-list `tag_ids` filter.
 *
 * The orders list URL encodes the active tag filter as a comma-separated list
 * of positive integers (e.g. `?tag_ids=3,7`). To make the URL the single
 * source of truth, parsing and serialization must round-trip exactly:
 *
 *   serialize(parse(value)) === <canonical form of value>
 *
 * Canonical form: ascending numeric sort, deduplicated, only positive
 * integers, no leading/trailing commas. An empty selection serializes to
 * `null` so callers can delete the URL parameter rather than emit `?tag_ids=`.
 */

/**
 * Parses the raw `tag_ids` URL value into a sorted, deduplicated array of
 * positive integers. Drops any non-integer / non-positive entries silently —
 * malformed input is rejected on the backend with `TAG_FILTER_INVALID`, but
 * the client treats stale/garbage URL values as "no filter" rather than
 * throwing in user faces.
 */
export function parseTagIdsParam(value: string | null): number[] {
  if (!value) return [];

  const parts = value.split(",").map((s) => Number(s.trim()));
  const valid = parts.filter((n) => Number.isInteger(n) && n > 0);

  // Set + sort gives a stable canonical order regardless of input order.
  return Array.from(new Set(valid)).sort((a, b) => a - b);
}

/**
 * Serializes an array of tag ids into the canonical URL value, or `null`
 * when the selection is empty (caller should remove the URL parameter
 * entirely in that case).
 */
export function serializeTagIdsParam(ids: number[]): string | null {
  if (ids.length === 0) return null;

  const sorted = Array.from(new Set(ids))
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);

  if (sorted.length === 0) return null;

  return sorted.join(",");
}
