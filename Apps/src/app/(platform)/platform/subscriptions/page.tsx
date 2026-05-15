"use client";

import { useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Receipt } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge, type StatusVariant } from "@/components/shared";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchPlatformSubscriptions } from "@/lib/store/slices/platform.thunks";
import { usePagination } from "@/hooks/usePagination";
import type { Subscription, SubscriptionStatus } from "@/types";

/**
 * Subscription status to badge variant mapping
 */
function getSubscriptionStatusVariant(
  status: SubscriptionStatus,
): StatusVariant {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "TRIALING":
      return "info";
    case "PAST_DUE":
      return "warning";
    case "CANCELED":
      return "error";
    case "EXPIRED":
      return "neutral";
    default:
      return "neutral";
  }
}

/**
 * Subscription status labels in Arabic
 */
function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case "ACTIVE":
      return "نشط";
    case "TRIALING":
      return "تجريبي";
    case "PAST_DUE":
      return "متأخر";
    case "CANCELED":
      return "ملغي";
    case "EXPIRED":
      return "منتهي";
    default:
      return status;
  }
}

/**
 * Billing cycle labels in Arabic
 */
function getBillingCycleLabel(cycle: string): string {
  switch (cycle) {
    case "MONTHLY":
      return "شهري";
    case "YEARLY":
      return "سنوي";
    default:
      return cycle;
  }
}

/**
 * Format date string to localized display
 */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("ar-LY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Platform Subscriptions Page
 * Displays a paginated table of all store subscriptions with store name,
 * plan name, status, billing cycle, and period dates.
 *
 * Requirements: 5.4
 */
export default function SubscriptionsPage() {
  const dispatch = useAppDispatch();
  const t = useTranslations("platform");
  const {
    items: subscriptions,
    meta,
    loading,
    error,
  } = useAppSelector((state) => state.platform.subscriptions);

  const { page, limit, params, setPage, setLimit, setSortBy, setSortOrder } =
    usePagination(1, 20);

  useEffect(() => {
    dispatch(fetchPlatformSubscriptions(params));
  }, [dispatch, params]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
    },
    [setPage],
  );

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      setLimit(newLimit);
    },
    [setLimit],
  );

  const handleSortChange = useCallback(
    (sortBy: string, sortOrder: "asc" | "desc") => {
      setSortBy(sortBy || undefined);
      setSortOrder(sortOrder);
    },
    [setSortBy, setSortOrder],
  );

  const handleRetry = useCallback(() => {
    dispatch(fetchPlatformSubscriptions(params));
  }, [dispatch, params]);

  const columns: ColumnDef<Subscription, unknown>[] = [
    {
      id: "store_name",
      header: "المتجر",
      cell: ({ row }) =>
        row.original.store?.name ?? `متجر #${row.original.store_id}`,
      enableSorting: false,
    },
    {
      id: "plan_name",
      header: "الخطة",
      cell: ({ row }) =>
        row.original.plan?.name ?? `خطة #${row.original.plan_id}`,
      enableSorting: false,
    },
    {
      id: "status",
      header: "الحالة",
      accessorKey: "status",
      enableSorting: true,
      cell: ({ row }) => (
        <StatusBadge
          label={getSubscriptionStatusLabel(row.original.status)}
          variant={getSubscriptionStatusVariant(row.original.status)}
        />
      ),
    },
    {
      id: "billing_cycle",
      header: "دورة الفوترة",
      accessorKey: "billing_cycle",
      enableSorting: true,
      cell: ({ row }) => getBillingCycleLabel(row.original.billing_cycle),
    },
    {
      id: "current_period_start",
      header: "بداية الفترة",
      accessorKey: "current_period_start",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.current_period_start),
    },
    {
      id: "current_period_end",
      header: "نهاية الفترة",
      accessorKey: "current_period_end",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.current_period_end),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">إدارة الاشتراكات</h2>
      </div>

      {/* Subscriptions Table */}
      <DataTable
        columns={columns}
        data={subscriptions}
        meta={meta}
        loading={loading}
        error={error}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onSortChange={handleSortChange}
        onRetry={handleRetry}
        emptyMessage="لا توجد اشتراكات بعد"
        emptyIcon={<Receipt className="h-12 w-12" />}
      />
    </div>
  );
}
