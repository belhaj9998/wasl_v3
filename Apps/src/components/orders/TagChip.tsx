"use client";

/**
 * TagChip
 *
 * Compact, color-coded label rendered everywhere a tag appears: orders list
 * column, order detail card, row expansion, picker selections, settings page.
 *
 * Color classes are sourced from `ORDER_TAG_COLORS[color_preset].chip`. All
 * spacing uses logical RTL-safe utilities (`ps-*`, `pe-*`, `ms-*`, `me-*`)
 * so the chip mirrors correctly under `dir="rtl"`.
 */

import { X } from "lucide-react";

import {
  ORDER_TAG_COLORS,
  type OrderTagColorClasses,
} from "@/lib/constants/orderTagColors";
import type { OrderTagColorPreset } from "@/types/orderTag.types";
import { cn } from "@/lib/utils/cn";

export interface TagChipProps {
  /** Tag display name. */
  name: string;
  /** Color preset key — drives the chip background/text/ring. */
  color_preset: OrderTagColorPreset;
  /**
   * When provided, renders a small remove (X) button at the end of the
   * chip. Triggered by click and Enter/Space when focused. Useful inside
   * the picker selection list.
   */
  onRemove?: () => void;
  /** Visual size — `sm` for table cells, `md` for cards/dialogs. */
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "text-[11px] py-0.5 ps-2 pe-2 leading-tight",
  md: "text-xs py-1 ps-2.5 pe-2.5 leading-tight",
};

/**
 * Renders a single tag chip. The chip is a non-interactive `<span>` unless
 * `onRemove` is supplied, in which case the remove button is the only
 * interactive child (the chip wrapper itself stays non-clickable so it can
 * sit safely inside other clickable surfaces).
 */
export function TagChip({
  name,
  color_preset,
  onRemove,
  size = "md",
  className,
}: TagChipProps) {
  const colors: OrderTagColorClasses =
    ORDER_TAG_COLORS[color_preset] ?? ORDER_TAG_COLORS.slate;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full ring-1 font-medium",
        SIZE_CLASSES[size],
        colors.chip,
        className,
      )}
      role="status"
      aria-label={name}
    >
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${name}`}
          className="ms-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export default TagChip;
