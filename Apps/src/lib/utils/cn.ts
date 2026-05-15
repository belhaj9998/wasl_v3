/**
 * Utility for merging Tailwind CSS classes with clsx
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
