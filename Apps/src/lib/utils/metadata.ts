/**
 * Metadata Utilities
 * Helper functions for generating SEO metadata with proper truncation.
 * Requirements: 1.2
 */

/**
 * Truncates a string to a maximum length, appending "..." if truncated.
 * Ensures the final string (including "...") does not exceed maxLength.
 */
export function truncateMetadata(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Generates a safe SEO title (max 70 characters).
 */
export function generateSeoTitle(text: string): string {
  return truncateMetadata(text, 70);
}

/**
 * Generates a safe SEO description (max 160 characters).
 */
export function generateSeoDescription(text: string): string {
  return truncateMetadata(text, 160);
}
