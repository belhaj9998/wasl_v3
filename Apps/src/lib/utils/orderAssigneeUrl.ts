/**
 * URL state utilities for the orders-list `assigned_user_id` filter.
 *
 * The orders list URL encodes the active assignee filter as one of:
 *   - `me`          → the requester's own orders (kept as a token, never
 *                     expanded to a numeric id, so the URL stays shareable)
 *   - `unassigned`  → orders with no assignee
 *   - `3,7`         → a comma-separated list of positive integer user ids
 *
 * To make the URL the single source of truth, parsing and serialization
 * round-trip exactly on canonical inputs:
 *
 *   serializeAssigneeParam(parseAssigneeParam(s)) === <canonical form of s>
 *   parseAssigneeParam(serializeAssigneeParam(v))  === <canonical form of v>
 *
 * Canonical form for ids: ascending numeric sort, deduplicated, positive
 * integers only. An empty / invalid selection serializes to `null` so callers
 * can delete the URL parameter rather than emit `?assigned_user_id=`.
 */

/**
 * Discriminated union describing the parsed assignee filter state.
 */
export type AssigneeFilterValue =
  | { kind: "none" }
  | { kind: "me" }
  | { kind: "unassigned" }
  | { kind: "ids"; ids: number[] };

/**
 * Parses the raw `assigned_user_id` URL value into an `AssigneeFilterValue`.
 *
 * Rules:
 *   - `null` / `""` (or whitespace-only)         → `{ kind: "none" }`
 *   - `"me"`                                      → `{ kind: "me" }`
 *   - `"unassigned"`                              → `{ kind: "unassigned" }`
 *   - `"3,7,3,9"`                                 → `{ kind: "ids", ids: [3, 7, 9] }`
 *       (dedupe, sort ascending, drop non-positive / non-integer values; an
 *        empty result collapses to `{ kind: "none" }`)
 *   - `"me,3"` / `"unassigned,3"` (sentinel mixed
 *      with anything else)                        → `{ kind: "none" }`
 *
 * The parser is intentionally lenient: a `me`/`unassigned` sentinel is only
 * valid on its own, and any other malformed/garbage token is dropped rather
 * than throwing. The backend remains the authoritative validator
 * (`ASSIGNEE_FILTER_INVALID`); the client treats stale/garbage URL values as
 * "no filter".
 */
export function parseAssigneeParam(value: string | null): AssigneeFilterValue {
  if (value == null) return { kind: "none" };

  // Trim around each token and drop empties so `"3, ,7"` and `"me,"` are
  // handled robustly.
  const tokens = value
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return { kind: "none" };

  // The `me` / `unassigned` sentinels are only valid on their own. Mixed with
  // any other token they form an invalid combination → treat as no filter.
  const hasMe = tokens.includes("me");
  const hasUnassigned = tokens.includes("unassigned");

  if (hasMe || hasUnassigned) {
    if (tokens.length === 1 && hasMe) return { kind: "me" };
    if (tokens.length === 1 && hasUnassigned) return { kind: "unassigned" };
    return { kind: "none" };
  }

  // Remaining tokens must be positive integers; silently drop anything else.
  // Set + sort yields a stable canonical order regardless of input order.
  const ids = Array.from(
    new Set(
      tokens
        .map((token) => Number(token))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ).sort((a, b) => a - b);

  if (ids.length === 0) return { kind: "none" };

  return { kind: "ids", ids };
}

/**
 * Serializes an `AssigneeFilterValue` into the canonical URL value, or `null`
 * when there is nothing to encode (caller should remove the URL parameter
 * entirely in that case).
 *
 *   - `{ kind: "none" }`            → `null`
 *   - `{ kind: "me" }`             → `"me"`
 *   - `{ kind: "unassigned" }`     → `"unassigned"`
 *   - `{ kind: "ids", ids: [3,7] }` → `"3,7"`
 *   - `{ kind: "ids", ids: [] }`    → `null`
 *
 * The `ids` branch re-applies the canonical normalization (dedupe + sort +
 * drop-invalid) before joining, so callers cannot accidentally emit a
 * non-canonical URL value.
 */
export function serializeAssigneeParam(
  value: AssigneeFilterValue,
): string | null {
  switch (value.kind) {
    case "none":
      return null;
    case "me":
      return "me";
    case "unassigned":
      return "unassigned";
    case "ids": {
      const ids = Array.from(new Set(value.ids))
        .filter((n) => Number.isInteger(n) && n > 0)
        .sort((a, b) => a - b);

      return ids.length === 0 ? null : ids.join(",");
    }
  }
}
