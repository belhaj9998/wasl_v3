"use client";

/**
 * AssignToMeButton
 *
 * One-click self-assignment control rendered next to the assignee dropdown on
 * the order detail page (mounted by `AssigneeCard`). Clicking it claims the
 * order for the current user by dispatching `assignOrderAssignee` with the
 * requester's own id.
 *
 * Visibility matrix (Requirement 11.6): the button renders only when the
 * current user has `orders.assign` AND appears in the current store's
 * eligible-assignees list. In every other case it renders nothing.
 *
 * No-op short-circuit (Requirement 11.4): when the order is already assigned to
 * the requester, the button stays enabled but the click handler returns early
 * without issuing a network request.
 *
 * Terminal status (Requirement 11.5): when the order is in a terminal status
 * (`CANCELED`, `RETURNED`, `DELIVERED`) the button is disabled and a tooltip
 * from `orders.assignee.cannotAssignTerminalStatus` explains why.
 *
 * Spacing uses logical RTL-safe utilities (`me-*`) so the button mirrors
 * correctly under `dir="rtl"`.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { assignOrderAssignee } from "@/lib/store/slices/orders.thunks";
import { useStore } from "@/hooks/useStore";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "sonner";

import type { Order } from "@/types";

/** Statuses in which an order is closed for assignment (Requirement 11.5). */
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
 * for a known code substring, mirroring the order-tag components.
 */
function extractErrorCode(message: string): KnownErrorCode | null {
  const upper = message.toUpperCase();
  for (const code of KNOWN_ERROR_CODES) {
    if (upper.includes(code)) return code;
  }
  return null;
}

export interface AssignToMeButtonProps {
  /** The order whose assignee the requester wants to claim. */
  order: Order;
}

export function AssignToMeButton({ order }: AssignToMeButtonProps) {
  const dispatch = useAppDispatch();
  const t = useTranslations("orders.assignee");
  const { currentStoreId } = useStore();

  const requester = useAppSelector((state) => state.auth.user);
  const canAssign = usePermission("orders.assign");

  // The requester's entry in the current store's eligible-assignees cache.
  // Its presence is both the visibility gate (Requirement 11.6) and the source
  // of the optimistic `{ id, name, avatar_url }` summary for the dispatch.
  const eligibleSelf = useAppSelector((state) => {
    if (currentStoreId == null || requester == null) return undefined;
    const items = state.eligibleAssignees.byStore[currentStoreId]?.items ?? [];
    return items.find((a) => a.id === requester.id);
  });

  const [submitting, setSubmitting] = useState(false);

  // Visibility matrix: hide entirely unless the user can assign AND is an
  // eligible assignee of the current store (Requirement 11.6).
  if (!canAssign || requester == null || eligibleSelf == null) {
    return null;
  }

  const isTerminal = TERMINAL_STATUSES.has(order.status);
  const alreadyMine = order.assigned_user?.id === requester.id;

  const handleClick = async () => {
    // Terminal orders never issue a network request (Requirement 11.5).
    if (isTerminal || submitting) return;

    // No-op short-circuit: already assigned to me → no network call
    // (Requirement 11.4). The button stays enabled.
    if (alreadyMine) return;

    setSubmitting(true);
    try {
      await dispatch(
        assignOrderAssignee({
          storeId: currentStoreId as number,
          orderId: order.id,
          payload: { user_id: requester.id },
          optimisticAssignee: {
            id: eligibleSelf.id,
            name: eligibleSelf.name,
            avatar_url: eligibleSelf.avatar_url,
          },
        }),
      ).unwrap();

      toast.success(t("toasts.selfAssignSuccess"));
    } catch (error: unknown) {
      // The slice already reverts the optimistic update on `rejected`; here we
      // only surface a localized error toast keyed by the server error code.
      const message = error instanceof Error ? error.message : String(error);
      const code = extractErrorCode(message);
      toast.error(code ? t(`errors.${code}`) : t("toasts.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isTerminal || submitting}
      aria-disabled={isTerminal || submitting}
    >
      <UserCheck className="me-1 h-4 w-4" aria-hidden="true" />
      {t("assignToMe")}
    </Button>
  );

  // When disabled by terminal status, explain why via a tooltip. A disabled
  // button does not fire pointer events, so wrap it in a focusable span that
  // can receive them (same pattern as TagPicker's create affordance).
  if (isTerminal) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent>{t("cannotAssignTerminalStatus")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

export default AssignToMeButton;
