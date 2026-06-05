"use client";

/**
 * AssigneeChip
 *
 * Compact, read-only display of an order's assignee rendered everywhere the
 * assignee appears: the order detail Assignee card, the orders-list filter,
 * the optional `assigned_user` table column, and each `ASSIGNEE_CHANGED`
 * timeline line.
 *
 * When `assignee` is non-null the chip shows the staff member's avatar
 * (falling back to their first initial) followed by their name. When
 * `assignee` is null it shows the localized "Unassigned" placeholder
 * (`orders.assignee.unassigned`) styled muted.
 *
 * All spacing uses logical RTL-safe utilities (`ps-*`, `pe-*`, `ms-*`,
 * `me-*`, `gap-*`) so the chip mirrors correctly under `dir="rtl"`. The
 * wrapper is a non-interactive `<span>` so the chip can sit safely inside
 * other clickable surfaces (e.g. an orders table row).
 */

import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AssignedUserSummary } from "@/types";
import { cn } from "@/lib/utils/cn";

export interface AssigneeChipProps {
  /** The current assignee, or null when the order is unassigned. */
  assignee: AssignedUserSummary | null;
  /** Visual size — `sm` for table cells, `md` for cards/dialogs. */
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "text-[11px] gap-1.5 leading-tight",
  md: "text-xs gap-2 leading-tight",
};

const AVATAR_SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "h-5 w-5 text-[9px]",
  md: "h-6 w-6 text-[10px]",
};

/** First non-whitespace character of a name, uppercased; "?" when empty. */
function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

/**
 * Renders a single assignee chip. Non-interactive by design — it carries no
 * click handlers so it can be embedded inside clickable rows or cards.
 */
export function AssigneeChip({
  assignee,
  size = "md",
  className,
}: AssigneeChipProps) {
  const t = useTranslations("orders.assignee");

  if (!assignee) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full items-center text-muted-foreground",
          SIZE_CLASSES[size],
          className,
        )}
        role="status"
        aria-label={t("unassigned")}
      >
        <span className="truncate">{t("unassigned")}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center font-medium",
        SIZE_CLASSES[size],
        className,
      )}
      role="status"
      aria-label={assignee.name}
    >
      <Avatar className={cn("shrink-0", AVATAR_SIZE_CLASSES[size])}>
        {assignee.avatar_url ? (
          <AvatarImage src={assignee.avatar_url} alt={assignee.name} />
        ) : null}
        <AvatarFallback className="font-medium">
          {initialOf(assignee.name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{assignee.name}</span>
    </span>
  );
}

export default AssigneeChip;
