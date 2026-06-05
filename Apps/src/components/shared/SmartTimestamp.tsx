"use client";

/**
 * SmartTimestamp
 *
 * Renders a single timestamp with smart relative/absolute wording and a tooltip
 * that reveals the full date and time in a chosen IANA timezone.
 *
 * Visible text rules (delegated to `formatSmartDate`):
 *   - `< 24h` → relative hours (e.g. "قبل ساعتين", "2 hours ago")
 *   - `< 7d`  → relative days (e.g. "أمس", "yesterday", "3 days ago")
 *   - `>= 7d` → absolute "YYYY-MM-DD"
 *   - future  → "الآن" / "Just now"
 *   - invalid → renders a single "—" placeholder span (no tooltip surface)
 *
 * Tooltip text (delegated to `formatFullDateTime`):
 *   - Arabic: "الجمعة 26 ديسمبر 2025 | 02:37 م"
 *   - English: "Friday, December 26, 2025 | 02:37 PM"
 *   Always rendered in `timezone` (default "Africa/Tripoli"). An invalid
 *   timezone string falls back to "Africa/Tripoli" inside the helper.
 *
 * Locale resolution:
 *   - If the `locale` prop is "ar" or "en", it is used directly.
 *   - Otherwise the `useLocale` hook from `next-intl` is consulted; any value
 *     other than the literal "en" is coerced to "ar" (Arabic-primary policy).
 *
 * Behavior contract:
 *   - Pure presentational. No timers, no auto-refresh, no Redux, no React
 *     context owned by this component, and no per-instance subscriptions.
 *   - Computes the visible text and tooltip text once per render. The text
 *     does not "tick" as time passes; a re-render (route change, data refetch)
 *     is required to refresh the relative wording.
 *   - The component does NOT mount a `TooltipProvider`. A provider must be
 *     mounted higher in the React tree (typically by the app shell). This is
 *     a deliberate choice so that hundreds of rows in a table do not each pay
 *     for a provider.
 *
 * Accessibility:
 *   - The trigger `<span>` carries `aria-label` and `title` set to the full
 *     date/time so the absolute time is announced even when the visible text
 *     is a relative phrase. `tabIndex={0}` lets keyboard users open the
 *     tooltip on focus.
 */

import type { ReactElement } from "react";
import { useLocale } from "next-intl";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import {
  formatFullDateTime,
  formatSmartDate,
  type SmartDateInput,
  type SmartDateLocale,
} from "@/lib/utils/formatDate";

export interface SmartTimestampProps {
  /** The timestamp to render. */
  date: SmartDateInput;
  /** Force a specific locale. When omitted, `useLocale()` is used. */
  locale?: SmartDateLocale;
  /** IANA timezone for the tooltip text. Defaults to "Africa/Tripoli". */
  timezone?: string;
  /** Additional class names forwarded to the trigger `<span>`. */
  className?: string;
}

const FALLBACK_TIMEZONE = "Africa/Tripoli";
const PLACEHOLDER = "—";

export function SmartTimestamp({
  date,
  locale: localeProp,
  timezone,
  className,
}: SmartTimestampProps): ReactElement {
  // Always call the hook to comply with the Rules of Hooks; pick prop value
  // afterwards. `useLocale` returns the active next-intl locale string.
  const intlLocale = useLocale();

  const resolvedLocale: SmartDateLocale =
    localeProp === "ar" || localeProp === "en"
      ? localeProp
      : intlLocale === "en"
        ? "en"
        : "ar";

  const tz = timezone ?? FALLBACK_TIMEZONE;

  const visibleText = formatSmartDate(date, resolvedLocale);
  const tooltipText = formatFullDateTime(date, resolvedLocale, tz);

  // Invalid date → placeholder, no tooltip surface
  if (visibleText === "" && tooltipText === "") {
    return (
      <span aria-label={PLACEHOLDER} className={cn(className)}>
        {PLACEHOLDER}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={tooltipText}
          title={tooltipText}
          className={cn(className)}
        >
          {visibleText}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
