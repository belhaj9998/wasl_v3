/**
 * Calculates the percentage change between two values.
 *
 * Formula: ((current - previous) / previous) * 100, rounded to 1 decimal place.
 * - If previous = 0 and current > 0: returns null (display as "+∞%" or "جديد")
 * - If both = 0: returns 0
 *
 * Requirements: 13.4
 */
export function calculatePercentageChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0 && current === 0) {
    return 0;
  }

  if (previous === 0 && current > 0) {
    return null; // Represents infinity — display as "+∞%" or "جديد"
  }

  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 10) / 10;
}

/**
 * Formats the percentage change for display.
 * - null → "+∞%" (en) or "جديد" (ar)
 * - 0 → "0%"
 * - positive → "+X.Y%"
 * - negative → "-X.Y%" (sign is already included)
 */
export function formatPercentageChange(
  change: number | null,
  locale: "ar" | "en" = "en",
): string {
  if (change === null) {
    return locale === "ar" ? "جديد" : "+∞%";
  }

  if (change === 0) {
    return "0%";
  }

  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}
