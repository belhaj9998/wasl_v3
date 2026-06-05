/**
 * Date formatting utilities using date-fns
 */

import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * Formats a date string or Date object into a readable format.
 * @param date - ISO date string or Date object
 * @param formatStr - date-fns format string (default: "yyyy-MM-dd")
 * @returns Formatted date string, or empty string if invalid
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatStr: string = "yyyy-MM-dd",
): string {
  if (!date) return "";

  const parsed = typeof date === "string" ? parseISO(date) : date;

  if (!isValid(parsed)) return "";

  return format(parsed, formatStr);
}

/**
 * Formats a date as a relative time string (e.g., "3 days ago").
 * @param date - ISO date string or Date object
 * @param locale - Locale for formatting ("ar" or "en")
 * @returns Relative time string, or empty string if invalid
 */
export function formatRelativeDate(
  date: string | Date | null | undefined,
  locale: "ar" | "en" = "ar",
): string {
  if (!date) return "";

  const parsed = typeof date === "string" ? parseISO(date) : date;

  if (!isValid(parsed)) return "";

  return formatDistanceToNow(parsed, {
    addSuffix: true,
    locale: locale === "ar" ? ar : undefined,
  });
}

/**
 * Formats a date with time (e.g., "2024-01-15 14:30").
 * @param date - ISO date string or Date object
 * @returns Formatted date-time string, or empty string if invalid
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, "yyyy-MM-dd HH:mm");
}

/**
 * Locale used by the smart timestamp helpers.
 */
export type SmartDateLocale = "ar" | "en";

/**
 * Accepted input shapes for the smart timestamp helpers.
 * - `string` is parsed via `parseISO` (ISO-8601 expected).
 * - `number` is treated as Unix epoch milliseconds.
 * - `Date` instance is used as-is.
 * - `null` / `undefined` / empty string / non-finite / invalid → empty string output.
 */
export type SmartDateInput = string | Date | number | null | undefined;

/**
 * Internal: normalize any SmartDateInput into a Date or null.
 * Returns `null` for invalid inputs; never throws.
 */
function normalizeSmartDate(date: SmartDateInput): Date | null {
  try {
    if (date === null || date === undefined) return null;
    if (typeof date === "string") {
      if (date === "") return null;
      const parsed = parseISO(date);
      return isValid(parsed) ? parsed : null;
    }
    if (typeof date === "number") {
      if (!Number.isFinite(date)) return null;
      const built = new Date(date);
      return isValid(built) ? built : null;
    }
    if (date instanceof Date) {
      return isValid(date) ? date : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the visible "smart" text for a timestamp.
 *
 * Branches by age:
 * - `< 24h` → relative hours via `formatDistanceToNow` (date-fns ar/en locale).
 * - `< 7d` → relative days via `formatDistanceToNow`.
 * - `>= 7d` → absolute `YYYY-MM-DD` date (no time).
 * - future (date strictly after now) → literal `"Just now"` / `"الآن"`.
 * - invalid input → empty string `""`.
 *
 * Pure: no module-level state, no timers, no I/O. Captures `new Date()` exactly
 * once per call. Total: any internal failure collapses to `""` via the outer
 * try/catch boundary.
 */
export function formatSmartDate(
  date: SmartDateInput,
  locale: SmartDateLocale,
): string {
  try {
    const parsed = normalizeSmartDate(date);
    if (!parsed) return "";

    const nowReference = new Date();
    const ageMs = nowReference.getTime() - parsed.getTime();

    // FutureWindow: locale-specific now-literal
    if (ageMs < 0) {
      return locale === "ar" ? "الآن" : "Just now";
    }

    const DAYS_7_MS = 604_800_000;

    // HoursWindow + DaysWindow: relative wording from date-fns
    if (ageMs < DAYS_7_MS) {
      return formatDistanceToNow(parsed, {
        addSuffix: true,
        locale: locale === "ar" ? ar : undefined,
      });
    }

    // AbsoluteWindow: ISO-style date, locale-independent
    return format(parsed, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

/**
 * Internal: validate that `tz` is a recognized IANA timezone identifier.
 * Returns `false` for null/empty/garbage. Never throws.
 */
function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Internal: reduce Intl.DateTimeFormat parts into a typed record.
 * Missing fields default to "" so the assembled template stays well-formed.
 */
function partsByType(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  const acc: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      acc[p.type] = p.value;
    }
  }
  return acc;
}

/**
 * Returns the full tooltip text for a timestamp in the requested IANA timezone.
 *
 * Format:
 * - Arabic (locale "ar", Intl `ar-LY`): `"<weekday> <day> <month> <year> | hh:mm <ص|م>"`.
 * - English (locale "en", Intl `en-US`): `"<Weekday>, <Month> <day>, <year> | hh:mm <AM|PM>"`.
 *
 * Timezone:
 * - `timezone` is validated via `Intl.DateTimeFormat`. If invalid (or empty/garbage),
 *   falls back to `"Africa/Tripoli"`. The date itself may still be valid.
 *
 * Pure: no module-level state, no timers, no I/O. Total: any internal failure
 * collapses to `""` via the outer try/catch boundary.
 */
export function formatFullDateTime(
  date: SmartDateInput,
  locale: SmartDateLocale,
  timezone: string,
): string {
  try {
    const parsed = normalizeSmartDate(date);
    if (!parsed) return "";

    const tz = isValidTimeZone(timezone) ? timezone : "Africa/Tripoli";
    const intlLocale = locale === "ar" ? "ar-LY" : "en-US";

    const dateFmt = new Intl.DateTimeFormat(intlLocale, {
      timeZone: tz,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const timeFmt = new Intl.DateTimeFormat(intlLocale, {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const dateParts = partsByType(dateFmt.formatToParts(parsed));
    const timeParts = partsByType(timeFmt.formatToParts(parsed));

    const weekday = dateParts.weekday ?? "";
    const day = dateParts.day ?? "";
    const month = dateParts.month ?? "";
    const year = dateParts.year ?? "";
    const hour = timeParts.hour ?? "";
    const minute = timeParts.minute ?? "";
    const dayPeriod = timeParts.dayPeriod ?? "";

    if (locale === "ar") {
      return `${weekday} ${day} ${month} ${year} | ${hour}:${minute} ${dayPeriod}`;
    }
    return `${weekday}, ${month} ${day}, ${year} | ${hour}:${minute} ${dayPeriod}`;
  } catch {
    return "";
  }
}
