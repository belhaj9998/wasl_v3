"use client";

/**
 * OrderStatusTabs
 *
 * Horizontal status-tabs strip rendered above the orders filter bar.
 * Shows one tab per ShipmentStatus value plus a leading "All" tab,
 * each with a localized label and a count badge.
 *
 * Behavior:
 * - Active tab reflects the current `value` prop and sets aria-current="page"
 * - Counts are sticky during loading: previous numbers stay visible (no flicker to 0)
 * - On error, every badge renders "—" but tabs remain clickable
 * - During initial load (counts === null), badges render "…"
 *
 * Requirements: 1.x, 2.x, 9.3, 10.1–10.3
 */

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ORDER_STATUS_LABELS } from "@/lib/constants/enums";
import type { OrderStatus } from "@/types";

const TAB_STATUSES: OrderStatus[] = [
  "DRAFT",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PREPARING",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELED",
  "RETURNED",
];

export type OrderStatusTabValue = "all" | OrderStatus;

export interface OrderStatusTabsProps {
  value: OrderStatusTabValue;
  counts: { total: number; by_status: Record<OrderStatus, number> } | null;
  loading: boolean;
  error: string | null;
  locale: "ar" | "en";
  onChange: (next: OrderStatusTabValue) => void;
}

export function OrderStatusTabs({
  value,
  counts,
  loading,
  error,
  locale,
  onChange,
}: OrderStatusTabsProps) {
  const allLabel = locale === "ar" ? "الكل" : "All";

  const renderBadge = (n: number | undefined): string => {
    if (error) return "—";
    if (n === undefined) return loading ? "…" : "—";
    return String(n);
  };

  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as OrderStatusTabValue)}
      className="w-full"
    >
      <TabsList
        className="flex w-full overflow-x-auto justify-start h-auto gap-1 p-1"
        aria-label={
          locale === "ar" ? "تبويبات حالة الطلب" : "Order status tabs"
        }
      >
        <TabsTrigger
          value="all"
          aria-current={value === "all" ? "page" : undefined}
          data-testid="order-status-tab-all"
          className="gap-2"
        >
          <span>{allLabel}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {renderBadge(counts?.total)}
          </span>
        </TabsTrigger>

        {TAB_STATUSES.map((status) => (
          <TabsTrigger
            key={status}
            value={status}
            aria-current={value === status ? "page" : undefined}
            data-testid={`order-status-tab-${status}`}
            className="gap-2"
          >
            <span>{ORDER_STATUS_LABELS[status]?.[locale] ?? status}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {renderBadge(counts?.by_status?.[status])}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
