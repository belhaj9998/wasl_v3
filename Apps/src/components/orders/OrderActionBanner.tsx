"use client";

/**
 * OrderActionBanner — reusable contextual banner for the Order Detail page.
 *
 * Variant-driven styling (warning / info / neutral), lucide-react icon,
 * and ARIA role mapped automatically (`role="alert"` for warning,
 * `role="status"` for info / neutral). RTL-safe: uses logical
 * Tailwind direction classes (`gap-`) rather than physical (`pl-`/`pr-`).
 */

import {
  AlertTriangle,
  Ban,
  Clock,
  MapPinOff,
  PhoneOff,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  OrderBannerIcon,
  OrderBannerVariant,
} from "@/lib/utils/orderBanners";

interface OrderActionBannerProps {
  variant: OrderBannerVariant;
  title: string;
  description?: string;
  icon: OrderBannerIcon;
  className?: string;
}

const VARIANT_CLASSES: Record<OrderBannerVariant, string> = {
  warning:
    "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200",
  info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200",
  neutral: "bg-muted border-border text-foreground",
};

const ICON_MAP: Record<OrderBannerIcon, LucideIcon> = {
  alert: AlertTriangle,
  "map-off": MapPinOff,
  "phone-off": PhoneOff,
  clock: Clock,
  ban: Ban,
};

export function OrderActionBanner({
  variant,
  title,
  description,
  icon,
  className,
}: OrderActionBannerProps) {
  const Icon = ICON_MAP[icon];
  const role = variant === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {description ? (
          <p className="text-sm opacity-90 mt-0.5">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export default OrderActionBanner;
