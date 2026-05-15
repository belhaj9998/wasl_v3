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
