"use client";

/**
 * Store Admin Orders List Page
 * Displays a paginated, sortable, filterable table of all store orders.
 * Columns: order_number, source, status (badge), payment_status, customer_name, total, created_at.
 * Supports filtering by status, payment_status, and source.
 *
 * Requirements: 9.1, 22.1
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Search, ShoppingCart, Eye } from "lucide-react";

import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchOrders } from "@/lib/store/slices/orders.thunks";
import { usePagination } from "@/hooks/usePagination";
import { useStore } from "@/hooks/useStore";
import { formatDate } from "@/lib/utils/formatDate";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants/enums";
import type { Order, OrderStatus, PaymentStatus, OrderSource } from "@/types";

// ─── Source Labels ───────────────────────────────────────────────────────────

const ORDER_SOURCE_LABELS: Record<OrderSource, { ar: string; en: string }> = {
  STOREFRONT: { ar: "المتجر", en: "Storefront" },
  ADMIN: { ar: "لوحة التحكم", en: "Admin" },
  MANUAL: { ar: "يدوي", en: "Manual" },
  INSTAGRAM: { ar: "انستغرام", en: "Instagram" },
  FACEBOOK: { ar: "فيسبوك", en: "Facebook" },
  TIKTOK: { ar: "تيك توك", en: "TikTok" },
};

// ─── Status Variant Helpers ──────────────────────────────────────────────────

function getOrderStatusVariant(
  status: OrderStatus,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "DELIVERED":
      return "success";
    case "CANCELED":
    case "RETURNED":
      return "error";
    case "PENDING":
    case "DRAFT":
      return "neutral";
    case "PROCESSING":
    case "PREPARING":
    case "CONFIRMED":
      return "info";
    case "SHIPPED":
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
      return "warning";
    default:
      return "neutral";
  }
}

function getPaymentStatusVariant(
  status: PaymentStatus,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "PAID":
      return "success";
    case "FAILED":
      return "error";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "warning";
    case "PENDING":
    case "PARTIALLY_PAID":
      return "info";
    case "UNPAID":
      return "neutral";
    default:
      return "neutral";
  }
}

// ─── Filter Options ──────────────────────────────────────────────────────────

const ORDER_STATUSES: OrderStatus[] = [
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

const PAYMENT_STATUSES: PaymentStatus[] = [
  "UNPAID",
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

const ORDER_SOURCES: OrderSource[] = [
  "STOREFRONT",
  "ADMIN",
  "MANUAL",
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
];

// ─── Orders Page ─────────────────────────────────────────────────────────────

export default function OrdersListPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentStoreId } = useStore();
  const locale = useAppSelector((state) => state.ui.locale);

  const {
    items: orders,
    meta,
    loading,
    error,
  } = useAppSelector((state) => state.orders);

  const {
    page,
    limit,
    sortBy,
    sortOrder,
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
  } = usePagination(1, 20);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setPage]);

  // Fetch orders when params change
  useEffect(() => {
    if (!currentStoreId) return;

    const params: Record<string, unknown> = {
      page,
      limit,
    };

    if (sortBy) {
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
    }

    if (search.trim()) {
      params.search = search.trim();
    }

    if (statusFilter !== "all") {
      params.status = statusFilter;
    }

    if (paymentStatusFilter !== "all") {
      params.payment_status = paymentStatusFilter;
    }

    if (sourceFilter !== "all") {
      params.source = sourceFilter;
    }

    dispatch(
      fetchOrders({
        storeId: currentStoreId,
        params: params as Record<string, unknown>,
      }),
    );
  }, [
    dispatch,
    currentStoreId,
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    statusFilter,
    paymentStatusFilter,
    sourceFilter,
  ]);

  // Handle sort change from DataTable
  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      setSortBy(newSortBy || undefined);
      setSortOrder(newSortOrder);
    },
    [setSortBy, setSortOrder],
  );

  // Handle retry on error
  const handleRetry = useCallback(() => {
    if (!currentStoreId) return;
    dispatch(fetchOrders({ storeId: currentStoreId, params: { page, limit } }));
  }, [dispatch, currentStoreId, page, limit]);

  // Table columns definition
  const columns: ColumnDef<Order, unknown>[] = useMemo(
    () => [
      {
        id: "order_number",
        accessorKey: "order_number",
        header: locale === "ar" ? "رقم الطلب" : "Order #",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">#{row.original.order_number}</span>
        ),
      },
      {
        id: "source",
        accessorKey: "source",
        header: locale === "ar" ? "المصدر" : "Source",
        enableSorting: true,
        cell: ({ row }) => {
          const source = row.original.source;
          return ORDER_SOURCE_LABELS[source]?.[locale] ?? source;
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: locale === "ar" ? "الحالة" : "Status",
        enableSorting: true,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <StatusBadge
              label={ORDER_STATUS_LABELS[status]?.[locale] ?? status}
              variant={getOrderStatusVariant(status)}
            />
          );
        },
      },
      {
        id: "payment_status",
        accessorKey: "payment_status",
        header: locale === "ar" ? "حالة الدفع" : "Payment",
        enableSorting: true,
        cell: ({ row }) => {
          const paymentStatus = row.original.payment_status;
          return (
            <StatusBadge
              label={
                PAYMENT_STATUS_LABELS[paymentStatus]?.[locale] ?? paymentStatus
              }
              variant={getPaymentStatusVariant(paymentStatus)}
            />
          );
        },
      },
      {
        id: "customer_name",
        accessorKey: "customer_name",
        header: locale === "ar" ? "العميل" : "Customer",
        enableSorting: true,
      },
      {
        id: "total",
        accessorKey: "total",
        header: locale === "ar" ? "الإجمالي" : "Total",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.total)}
          </span>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: locale === "ar" ? "التاريخ" : "Date",
        enableSorting: true,
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        id: "actions",
        header: locale === "ar" ? "الإجراءات" : "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/admin/orders/${row.original.id}`)}
            aria-label={locale === "ar" ? "عرض الطلب" : "View order"}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [locale, router],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {locale === "ar" ? "الطلبات" : "Orders"}
          </h2>
          <p className="text-muted-foreground">
            {locale === "ar"
              ? "عرض وإدارة جميع طلبات المتجر"
              : "View and manage all store orders"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              locale === "ar"
                ? "بحث برقم الطلب أو اسم العميل..."
                : "Search by order number or customer..."
            }
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue
              placeholder={locale === "ar" ? "حالة الطلب" : "Order Status"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {locale === "ar" ? "جميع الحالات" : "All Statuses"}
            </SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUS_LABELS[status]?.[locale] ?? status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Payment status filter */}
        <Select
          value={paymentStatusFilter}
          onValueChange={(value) => {
            setPaymentStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue
              placeholder={locale === "ar" ? "حالة الدفع" : "Payment Status"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {locale === "ar" ? "جميع حالات الدفع" : "All Payments"}
            </SelectItem>
            {PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]?.[locale] ?? status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source filter */}
        <Select
          value={sourceFilter}
          onValueChange={(value) => {
            setSourceFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={locale === "ar" ? "المصدر" : "Source"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {locale === "ar" ? "جميع المصادر" : "All Sources"}
            </SelectItem>
            {ORDER_SOURCES.map((source) => (
              <SelectItem key={source} value={source}>
                {ORDER_SOURCE_LABELS[source]?.[locale] ?? source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={orders}
        meta={meta}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSortChange={handleSortChange}
        onRetry={handleRetry}
        emptyMessage={locale === "ar" ? "لا توجد طلبات" : "No orders found"}
        emptyIcon={<ShoppingCart className="h-12 w-12" />}
      />
    </div>
  );
}
