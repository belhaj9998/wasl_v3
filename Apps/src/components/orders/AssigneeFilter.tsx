"use client";

/**
 * AssigneeFilter
 *
 * Orders-list assignee filter. Mirrors `OrderTagsFilter`: it holds a local
 * *draft* selection while the dropdown is open and commits to the parent (and
 * therefore to the URL) only when the dropdown closes — never per-click — so
 * the URL state updates as a single history entry rather than per keystroke.
 *
 * The selection model is the `AssigneeFilterValue` discriminated union from
 * `@/lib/utils/orderAssigneeUrl`:
 *   - `{ kind: "none" }`        → no filter
 *   - `{ kind: "me" }`          → the requester's own orders (token `me`)
 *   - `{ kind: "unassigned" }`  → orders with no assignee
 *   - `{ kind: "ids"; ids }`    → a specific set of eligible-assignee ids
 *
 * Mutual exclusivity (Requirement 13.5): `Me` and `Unassigned` are
 * single-select pseudo-options that wipe any other selection, and selecting an
 * eligible id clears `me`/`unassigned`. This guarantees the parent never
 * serializes an invalid mix (Requirement 9.6). Selecting only `Me` keeps the
 * draft as `{ kind: "me" }` (never expanded to a numeric id) so the URL stays
 * shareable across users (Requirement 13.2).
 *
 * The whole control is wrapped in `<PermissionGate permission="orders.assign">`
 * so it is hidden entirely for callers without the permission (Requirement
 * 13.8). The eligible-assignees vocabulary is lazy-loaded the first time the
 * dropdown opens via the idempotent `fetchEligibleAssignees` thunk.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Users, UserCheck, UserX, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/shared/PermissionGate";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchEligibleAssignees } from "@/lib/store/slices/eligibleAssignees.thunks";
import { useStore } from "@/hooks/useStore";
import { cn } from "@/lib/utils/cn";
import type { AssigneeFilterValue } from "@/lib/utils/orderAssigneeUrl";

import { AssigneeChip } from "./AssigneeChip";

export interface AssigneeFilterProps {
  /** Currently committed assignee filter value (canonical form). */
  value: AssigneeFilterValue;
  /** Emitted on commit (dropdown close / clear). */
  onChange: (next: AssigneeFilterValue) => void;
  locale: "ar" | "en";
}

/**
 * Structural equality for two `AssigneeFilterValue`s. Used as a no-op guard so
 * closing the dropdown without an effective change does not emit a redundant
 * `onChange` (and therefore no redundant URL update). For the `ids` branch the
 * ids are compared positionally — both sides are already canonical (sorted
 * ascending, deduplicated) so this is a faithful set comparison.
 */
function valuesEqual(a: AssigneeFilterValue, b: AssigneeFilterValue): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "ids" && b.kind === "ids") {
    if (a.ids.length !== b.ids.length) return false;
    for (let i = 0; i < a.ids.length; i += 1) {
      if (a.ids[i] !== b.ids[i]) return false;
    }
    return true;
  }
  return true;
}

/** Count of active selections for the committed value (drives the badge). */
function activeCount(value: AssigneeFilterValue): number {
  switch (value.kind) {
    case "none":
      return 0;
    case "me":
    case "unassigned":
      return 1;
    case "ids":
      return value.ids.length;
  }
}

/** Toggle a single eligible id within the draft, clearing me/unassigned. */
function toggleId(value: AssigneeFilterValue, id: number): AssigneeFilterValue {
  const current = value.kind === "ids" ? value.ids : [];
  const next = current.includes(id)
    ? current.filter((existing) => existing !== id)
    : [...current, id].sort((a, b) => a - b);
  return next.length === 0 ? { kind: "none" } : { kind: "ids", ids: next };
}

export function AssigneeFilter({
  value,
  onChange,
  locale,
}: AssigneeFilterProps) {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("orders.assignee.filter");

  const eligible = useAppSelector((state) =>
    currentStoreId != null
      ? (state.eligibleAssignees.byStore[currentStoreId]?.items ?? [])
      : [],
  );
  const loading = useAppSelector((state) =>
    currentStoreId != null
      ? (state.eligibleAssignees.byStore[currentStoreId]?.loading ?? false)
      : false,
  );
  const loadedAt = useAppSelector((state) =>
    currentStoreId != null
      ? (state.eligibleAssignees.byStore[currentStoreId]?.loadedAt ?? null)
      : null,
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AssigneeFilterValue>(value);

  // Keep the draft in sync with externally-driven changes (e.g. URL hydration).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Lazy-load the eligible-assignees vocabulary the first time the dropdown
  // opens. Gating on the store-cache entry (loaded/loading) rather than
  // `items.length` is critical: in a store with no eligible members an empty
  // array would otherwise keep this effect re-firing after every fulfilled
  // fetch. The thunk is idempotent (60s TTL) so dispatching here is safe.
  useEffect(() => {
    if (!open || currentStoreId == null) return;
    if (loading || loadedAt != null) return;
    dispatch(fetchEligibleAssignees(currentStoreId));
  }, [open, currentStoreId, loading, loadedAt, dispatch]);

  const meActive = draft.kind === "me";
  const unassignedActive = draft.kind === "unassigned";
  const selectedIds = useMemo(
    () => new Set(draft.kind === "ids" ? draft.ids : []),
    [draft],
  );

  // Selecting `Me` wipes everything else → single-select pseudo-option.
  const selectMe = () => {
    setDraft((prev) =>
      prev.kind === "me" ? { kind: "none" } : { kind: "me" },
    );
  };

  // Selecting `Unassigned` wipes everything else → single-select pseudo-option.
  const selectUnassigned = () => {
    setDraft((prev) =>
      prev.kind === "unassigned" ? { kind: "none" } : { kind: "unassigned" },
    );
  };

  // Selecting an eligible id toggles it and clears me/unassigned.
  const selectId = (id: number) => {
    setDraft((prev) => toggleId(prev, id));
  };

  // Clear commits immediately (matches OrderTagsFilter's clear).
  const clear = () => {
    setDraft({ kind: "none" });
    onChange({ kind: "none" });
  };

  // Commit on close. The equality guard makes closing without an effective
  // change a no-op (prevents redundant URL updates).
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && !valuesEqual(draft, value)) {
      onChange(draft);
    }
  };

  const count = activeCount(value);

  const triggerLabel = (() => {
    switch (value.kind) {
      case "me":
        return t("me");
      case "unassigned":
        return t("unassigned");
      case "ids":
        return t("selected", { count: value.ids.length });
      case "none":
        return t("label");
    }
  })();

  return (
    <PermissionGate permission="orders.assign">
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-10 gap-2">
            <Users className="h-4 w-4" />
            <span className="truncate">{triggerLabel}</span>
            {count > 0 && (
              <span
                className="ms-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
                aria-hidden="true"
              >
                {count}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 p-2">
          <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-2">
            <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">
              {t("label")}
            </div>

            <div
              role="listbox"
              aria-multiselectable="true"
              aria-label={t("label")}
              className="max-h-72 overflow-y-auto"
            >
              <ul className="space-y-1">
                {/* Leading pseudo-option: Me (token `me`). */}
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={meActive}
                    onClick={selectMe}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent",
                      meActive && "bg-accent/60",
                    )}
                  >
                    <UserCheck
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate font-medium">
                      {t("me")}
                    </span>
                    {meActive && (
                      <Check
                        className="h-4 w-4 shrink-0 text-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>

                {/* Leading pseudo-option: Unassigned (token `unassigned`). */}
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={unassignedActive}
                    onClick={selectUnassigned}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent",
                      unassignedActive && "bg-accent/60",
                    )}
                  >
                    <UserX
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate font-medium">
                      {t("unassigned")}
                    </span>
                    {unassignedActive && (
                      <Check
                        className="h-4 w-4 shrink-0 text-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>

                {/* Divider between pseudo-options and the eligible roster. */}
                <li aria-hidden="true" className="my-1 border-t" />

                {/* Eligible assignees. */}
                {loading && eligible.length === 0 ? (
                  <li className="p-3 text-center text-sm text-muted-foreground">
                    {t("label")}
                  </li>
                ) : (
                  eligible.map((assignee) => {
                    const checked = selectedIds.has(assignee.id);
                    return (
                      <li key={assignee.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={checked}
                          onClick={() => selectId(assignee.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent",
                            checked && "bg-accent/60",
                          )}
                        >
                          <AssigneeChip
                            assignee={assignee}
                            size="sm"
                            className="flex-1"
                          />
                          {checked && (
                            <Check
                              className="h-4 w-4 shrink-0 text-foreground"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            {count > 0 && (
              <div className="border-t pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={clear}
                >
                  <X className="me-1 h-3.5 w-3.5" />
                  {t("clear")}
                </Button>
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </PermissionGate>
  );
}

export default AssigneeFilter;
