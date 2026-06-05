/**
 * Pure utilities for resolving table column state from saved preferences and
 * the current column definitions. Used by the orders table (and reusable for
 * future tables) to translate persisted user choices into TanStack-ready
 * `columnVisibility` and `columnOrder` values.
 *
 * Guarantees:
 * - Migration-safe: unknown saved ids are dropped; defined ids missing from
 *   saved state are appended in their default position.
 * - Mandatory invariants honored: pinned ids always trail the order;
 *   forced-visible ids are always `true`.
 * - Pure function — no React, no Redux, no I/O.
 */

export interface ColumnLabel {
  ar: string;
  en: string;
}

export interface ColumnMeta {
  /** Stable id matching the TanStack column definition `id`. */
  id: string;
  /** Localized label used by the customize-columns menu UI. */
  label: ColumnLabel;
}

export interface ResolvedColumnState {
  /** TanStack `state.columnVisibility` value. */
  visibility: Record<string, boolean>;
  /** TanStack `state.columnOrder` value. */
  order: string[];
}

export interface ResolveColumnStateOptions {
  /**
   * Column ids that must occupy the trailing positions of the order array,
   * in the listed sequence. Typically `["actions"]`.
   */
  pinnedLastIds: string[];
  /**
   * Column ids whose visibility must always be `true`, regardless of the
   * saved value. Typically `["order_number", "actions"]`.
   */
  forcedVisibleIds: string[];
}

/**
 * Resolves the effective `columnVisibility` and `columnOrder` for a table
 * given the user's saved preferences and the current column definitions.
 *
 * Order rules:
 * 1. Take saved order entries that are present in the defined columns and not
 *    in `pinnedLastIds`, preserving their saved sequence.
 * 2. Append defined ids that are missing from the saved order, in their
 *    default (defined) position.
 * 3. Append `pinnedLastIds` (filtered to defined ids) at the trailing index.
 *
 * Visibility rules:
 * 1. Build a record keyed exactly by the defined column ids.
 * 2. For each defined id, use the saved boolean if present and a boolean;
 *    otherwise default to `true` (visible).
 * 3. Force every id in `forcedVisibleIds` (that is also a defined id) to
 *    `true`, even if the saved value is `false`.
 *
 * Pure: no side effects, no exceptions thrown for ordinary input.
 */
export function resolveColumnState(
  savedVisibility: Record<string, boolean> | undefined,
  savedOrder: string[] | undefined,
  definedColumns: ColumnMeta[],
  options: ResolveColumnStateOptions,
): ResolvedColumnState {
  const definedIds = definedColumns.map((c) => c.id);
  const definedSet = new Set(definedIds);

  // ----- Order -----
  const pinned = options.pinnedLastIds.filter((id) => definedSet.has(id));
  const pinnedSet = new Set(pinned);

  // 1. Saved order entries that are known and not pinned (preserves saved sequence).
  const fromSaved =
    savedOrder?.filter((id) => definedSet.has(id) && !pinnedSet.has(id)) ?? [];
  const fromSavedSet = new Set(fromSaved);

  // 2. Defined ids missing from saved order, in their default position.
  const appended = definedIds.filter(
    (id) => !fromSavedSet.has(id) && !pinnedSet.has(id),
  );

  // 3. Final order: saved → appended → pinned (always trailing).
  const order = [...fromSaved, ...appended, ...pinned];

  // ----- Visibility -----
  const visibility: Record<string, boolean> = {};
  for (const id of definedIds) {
    const saved = savedVisibility?.[id];
    visibility[id] = typeof saved === "boolean" ? saved : true;
  }
  for (const id of options.forcedVisibleIds) {
    if (definedSet.has(id)) {
      visibility[id] = true;
    }
  }

  return { visibility, order };
}
