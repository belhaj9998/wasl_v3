/**
 * Locale-aware formatting utilities for Wasl SaaS
 * Supports Arabic and English locales with proper number systems.
 */

import type { SupportedLocale } from "./config";

/**
 * Formats a number as Libyan Dinar (LYD) currency.
 * Uses 3 decimal places and the symbol "د.ل" after the number.
 * Supports Arabic digits (٠-٩) for Arabic locale and Latin digits (0-9) for English.
 *
 * @param amount - The numeric amount to format
 * @param locale - The locale ('ar' or 'en')
 * @returns Formatted currency string, e.g., "125.500 د.ل" or "١٢٥٫٥٠٠ د.ل"
 */
export function formatCurrencyLYD(
  amount: number,
  locale: SupportedLocale,
): string {
  const digits = locale === "ar" ? "arab" : "latn";
  const formatted = new Intl.NumberFormat(`${locale}-LY`, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
    numberingSystem: digits,
  }).format(amount);

  return `${formatted} د.ل`;
}

/**
 * Formats a date according to the given locale.
 * Uses Intl.DateTimeFormat for locale-aware date formatting.
 *
 * @param date - ISO date string or Date object
 * @param locale - The locale ('ar' or 'en')
 * @param options - Optional Intl.DateTimeFormatOptions for custom formatting
 * @returns Formatted date string, or empty string if invalid
 */
export function formatDateLocale(
  date: string | Date | null | undefined,
  locale: SupportedLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return "";

  const parsed = typeof date === "string" ? new Date(date) : date;

  if (isNaN(parsed.getTime())) return "";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };

  return new Intl.DateTimeFormat(`${locale}-LY`, defaultOptions).format(parsed);
}

/**
 * Formats a date with time according to the given locale.
 *
 * @param date - ISO date string or Date object
 * @param locale - The locale ('ar' or 'en')
 * @returns Formatted date-time string, or empty string if invalid
 */
export function formatDateTimeLocale(
  date: string | Date | null | undefined,
  locale: SupportedLocale,
): string {
  return formatDateLocale(date, locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
