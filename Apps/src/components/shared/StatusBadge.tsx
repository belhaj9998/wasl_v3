"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export type StatusVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

export interface StatusBadgeProps {
  /** The label text to display inside the badge */
  label: string;
  /** The color variant for the badge */
  variant: StatusVariant;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success:
    "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  warning:
    "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  error:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  neutral:
    "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

/**
 * StatusBadge — displays a color-coded badge for order/product/store statuses.
 */
export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(variantStyles[variant], className)}>{label}</Badge>
  );
}
