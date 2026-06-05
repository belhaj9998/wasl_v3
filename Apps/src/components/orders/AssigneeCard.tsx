"use client";

/**
 * AssigneeCard
 *
 * Right-column card on the order detail page (mounted next to the Tags card).
 * Always visible. Renders the order's current assignee via `AssigneeChip`, and
 * — for users who hold `orders.assign` — exposes the editable controls: a
 * single-select assignee dropdown plus the one-click `AssignToMeButton`.
 *
 * shadcn/ui has no `Popover` / `Command` / `Combobox` primitive in this
 * project, so the dropdown is rendered inside a small `Dialog` for a familiar,
 * accessible, RTL-safe pattern (focus trap, escape-to-close) — mirroring
 * `TagPicker`. Unlike `TagPicker` this picker is SINGLE-select: choosing an
 * option commits the assignment immediately and closes the dialog.
 *
 * Permission matrix (Requirement 12.7): the editable controls are wrapped in
 * `<PermissionGate permission="orders.assign">`. Without the permission the
 * card renders only the read-only `AssigneeChip` (via the gate's `fallback`)
 * and never the dropdown or the "Assign to me" button.
 *
 * Terminal status (Requirements 12.x / 15.5): when the order is in a terminal
 * status (`CANCELED`, `RETURNED`, `DELIVERED`) the dropdown trigger and the
 * `AssignToMeButton` are disabled, with a tooltip from
 * `orders.assignee.cannotAssignTerminalStatus`. (`AssignToMeButton` handles its
 * own terminal-disabled tooltip internally.)
 *
 * All spacing uses logical RTL-safe utilities (`ps-*`, `pe-*`, `ms-*`, `me-*`,
 * `gap-*`) so the card mirrors correctly under `dir="rtl"`.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Search, User } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PermissionGate } from "@/components/shared/PermissionGate";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchEligibleAssignees } from "@/lib/store/slices/eligibleAssignees.thunks";
import { assignOrderAssignee } from "@/lib/store/slices/orders.thunks";
import { useStore } from "@/hooks/useStore";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils/cn";

import { AssigneeChip } from "./AssigneeChip";
import { AssignToMeButton } from "./AssignToMeButton";
import type { EligibleAssignee, Order } from "@/types";

/** Statuses in which an order is closed for assignment (Requirement 15.5). */
const TERMINAL_STATUSES = new Set(["CANCELED", "RETURNED", "DELIVERED"]);

/** Server error codes the toast layer can map to a localized message. */
const KNOWN_ERROR_CODES = [
  "VALIDATION_ERROR",
  "ASSIGNEE_NOT_ELIGIBLE",
  "ORDER_NOT_FOUND",
  "ORDER_TERMINAL_STATUS",
  "FORBIDDEN",
] as const;

type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

/**
 * The server embeds the error code in the thrown error's message tail. Scan it
 * for a known code substring, mirroring `AssignToMeButton` and the order-tag
 * components.
 */
function extractErrorCode(message: string): KnownErrorCode | null {
  const upper = message.toUpperCase();
  for (const code of KNOWN_ERROR_CODES) {
    if (upper.includes(code)) return code;
  }
  return null;
}

export interface AssigneeCardProps {
  /** The order whose assignee this card displays and (optionally) edits. */
  order: Order;
}

export function AssigneeCard({ order }: AssigneeCardProps) {
  const dispatch = useAppDispatch();
  const t = useTranslations("orders.assignee");
  const { currentStoreId } = useStore();

  const canAssign = usePermission("orders.assign");

  // Cached eligible assignees for the current store (populated by the mount
  // fetch below). The dropdown reads its options from here.
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

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Pre-warm the eligible-assignees cache so the dropdown has data on first
  // open. The thunk is idempotent (60s TTL), so dispatching on every mount is
  // safe. Gated on `canAssign` because the endpoint requires `orders.assign`
  // server-side — read-only users would only get a 403.
  useEffect(() => {
    if (currentStoreId == null || !canAssign) return;
    dispatch(fetchEligibleAssignees(currentStoreId));
  }, [currentStoreId, canAssign, dispatch]);

  const isTerminal = TERMINAL_STATUSES.has(order.status);
  const currentAssigneeId = order.assigned_user?.id ?? null;

  const filteredEligible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return eligible;
    return eligible.filter((a) => a.name.toLowerCase().includes(query));
  }, [eligible, search]);

  /**
   * Commit a selection. `assignee` is the chosen eligible-assignee, or `null`
   * for the "Unassign" sentinel. Closes the dialog, short-circuits the no-op
   * (already the current value), then dispatches the optimistic assignment.
   */
  const handleSelect = async (assignee: EligibleAssignee | null) => {
    if (currentStoreId == null) return;

    setOpen(false);
    setSearch("");

    const userId = assignee?.id ?? null;

    // No-op short-circuit: selecting the already-current value issues no
    // network request (the server is idempotent here too).
    if (userId === currentAssigneeId) return;

    try {
      await dispatch(
        assignOrderAssignee({
          storeId: currentStoreId,
          orderId: order.id,
          payload: { user_id: userId },
          optimisticAssignee: assignee
            ? {
                id: assignee.id,
                name: assignee.name,
                avatar_url: assignee.avatar_url,
              }
            : null,
        }),
      ).unwrap();

      // The fulfilled reducer replaces the whole order DTO (its `assigned_user`
      // and `timeline` are authoritative), so the timeline refreshes itself.
      toast.success(
        userId === null
          ? t("toasts.unassignSuccess")
          : t("toasts.assignSuccess"),
      );
    } catch (error: unknown) {
      // The slice already reverts the optimistic update on `rejected`; here we
      // only surface a localized error toast keyed by the server error code.
      const message = error instanceof Error ? error.message : String(error);
      const code = extractErrorCode(message);
      toast.error(code ? t(`errors.${code}`) : t("toasts.errorGeneric"));
    }
  };

  // The dropdown trigger reflects the current assignee (or the select
  // placeholder). Disabled on terminal orders.
  const trigger = (
    <Button
      type="button"
      variant="outline"
      onClick={() => setOpen(true)}
      disabled={isTerminal}
      aria-disabled={isTerminal}
      className="h-auto min-h-9 w-full justify-between gap-2"
    >
      {order.assigned_user ? (
        <AssigneeChip assignee={order.assigned_user} size="sm" />
      ) : (
        <span className="text-muted-foreground">{t("selectPlaceholder")}</span>
      )}
      <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
    </Button>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5" aria-hidden="true" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <PermissionGate
          permission="orders.assign"
          fallback={<AssigneeChip assignee={order.assigned_user} />}
        >
          {/* Editable controls (Requirements 11.1, 12.1–12.6, 15.4). */}
          <div className="space-y-3">
            {/* Disabled-trigger tooltip for terminal orders (Requirement 15.5).
                A disabled button does not fire pointer events, so wrap it in a
                focusable span — same pattern as TagPicker / AssignToMeButton. */}
            {isTerminal ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="block">
                      {trigger}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("cannotAssignTerminalStatus")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              trigger
            )}

            <div className="flex items-center justify-end">
              <AssignToMeButton order={order} />
            </div>
          </div>
        </PermissionGate>
      </CardContent>

      {/* Single-select assignee dropdown (Dialog-based, mirrors TagPicker). */}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("selectPlaceholder")}
                className="ps-9"
                autoFocus
              />
            </div>

            <div
              role="listbox"
              aria-label={t("title")}
              className="max-h-72 overflow-y-auto rounded-md border"
            >
              <ul className="divide-y">
                {/* Leading "Unassign" sentinel → user_id: null (Req 12.1). */}
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={currentAssigneeId === null}
                    onClick={() => handleSelect(null)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-start text-sm transition hover:bg-accent",
                      currentAssigneeId === null && "bg-accent/60",
                    )}
                  >
                    <span className="flex-1 truncate font-medium text-muted-foreground">
                      {t("unassignSentinelLabel")}
                    </span>
                    {currentAssigneeId === null && (
                      <Check
                        className="h-4 w-4 text-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>

                {loading && eligible.length === 0 ? (
                  <li className="p-4 text-center text-sm text-muted-foreground">
                    {t("selectPlaceholder")}
                  </li>
                ) : (
                  filteredEligible.map((assignee) => {
                    const checked = assignee.id === currentAssigneeId;
                    return (
                      <li key={assignee.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={checked}
                          onClick={() => handleSelect(assignee)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2 text-start text-sm transition hover:bg-accent",
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
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default AssigneeCard;
