/**
 * Currency formatting utility for Libyan Dinar (LYD)
 * Formats numbers with 2 decimal places and the Libyan Dinar symbol
 */

/**
 * Formats a number or numeric string as Libyan Dinar currency.
 * @param amount - The amount to format (number or string)
 * @returns Formatted string, e.g., "25.00 د.ل"
 */
export function formatCurrency(amount: number | string): string {
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return "0.00 د.ل";
  }

  const formatted = numericAmount.toFixed(2);
  return `${formatted} د.ل`;
}
