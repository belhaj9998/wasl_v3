"use client";

/**
 * Store Admin Orders List Page — Client Component
 * Displays a paginated, sortable, filterable table of all store orders.
 * Columns: order_number, source, status (badge), payment_status, customer_name, total, created_at, tags.
 * Supports filtering by status, payment_status, source, and tag ids (URL-stable).
 * Supports row selection for bulk tag operations (add/remove).
 *
 * Requirements: 9.1, 22.1, plus order-tags 4.2, 5.1, 5.2, 5.5, 8.1, 8.2, 8.3, 3.1, 3.2
 */

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type MouseEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ColumnDef } from "@tanstack/react-table";
import { Search, ShoppingCart, ChevronDown } from "lucide-react";

import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { OrderRowExpansion } from "@/components/tables/OrderRowExpansion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchOrders,
  fetchOrderCounts,
} from "@/lib/store/slices/orders.thunks";
import {
  selectOrdersPreferences,
  setOrdersVisibility,
  setOrdersOrder,
  resetOrders,
} from "@/lib/store/slices/tablePreferences.slice";
import { resolveColumnState, type ColumnMeta } from "@/lib/utils/tableColumns";
import { ColumnVisibilityMenu } from "@/components/tables/ColumnVisibilityMenu";
import { OrderStatusTabs } from "@/components/tables/OrderStatusTabs";
import type { OrderStatusTabValue } from "@/components/tables/OrderStatusTabs";
import { OrderTagsFilter } from "@/components/orders/OrderTagsFilter";
import { BulkTagActions } from "@/components/orders/BulkTagActions";
import { TagChip } from "@/components/orders/TagChip";
import { AssigneeFilter } from "@/components/orders/AssigneeFilter";
import { AssigneeChip } from "@/components/orders/AssigneeChip";
import { SourceBadge } from "@/components/orders/SourceBadge";
import { SourceFilter } from "@/components/orders/SourceFilter";
import { usePagination } from "@/hooks/usePagination";
import { useStore } from "@/hooks/useStore";
import { formatDate } from "@/lib/utils/formatDate";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  parseTagIdsParam,
  serializeTagIdsParam,
} from "@/lib/utils/orderTagUrl";
import {
  parseAssigneeParam,
  serializeAssigneeParam,
  type AssigneeFilterValue,
} from "@/lib/utils/orderAssigneeUrl";
import {
  parseSourceParam,
  serializeSourceParam,
  type SourceFilterValue,
} from "@/lib/utils/orderSourceUrl";
import { fetchEligibleAssignees } from "@/lib/store/slices/eligibleAssignees.thunks";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants/enums";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

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

// ─── Orders Page ─────────────────────────────────────────────────────────────

export default function OrdersPageClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentStoreId } = useStore();
  const locale = useAppSelector((state) => state.ui.locale);
  const tA11y = useTranslations("accessibility.buttons");

  const ordersPrefs = useAppSelector(selectOrdersPreferences);

  // Defined columns for the orders table (drives both the table and the menu).
  // Selection is a synthetic column id; tags are hidden by default and the
  // user toggles them via the column visibility menu.
  const definedColumns: ColumnMeta[] = useMemo(
    () => [
      { id: "select", label: { ar: "تحديد", en: "Select" } },
      { id: "order_number", label: { ar: "رقم الطلب", en: "Order #" } },
      { id: "source", label: { ar: "المصدر", en: "Source" } },
      { id: "status", label: { ar: "الحالة", en: "Status" } },
      { id: "payment_status", label: { ar: "حالة الدفع", en: "Payment" } },
      { id: "customer_name", label: { ar: "العميل", en: "Customer" } },
      { id: "tags", label: { ar: "الوسوم", en: "Tags" } },
      { id: "assigned_user", label: { ar: "المسؤول", en: "Assignee" } },
      { id: "total", label: { ar: "الإجمالي", en: "Total" } },
      { id: "created_at", label: { ar: "التاريخ", en: "Date" } },
      { id: "actions", label: { ar: "الإجراءات", en: "Actions" } },
    ],
    [],
  );

  // Resolve effective column state from saved preferences + defaults +
  // mandatory invariants. `resolveColumnState` is pure and migration-safe.
  // The tags column is intentionally not forced visible; users opt in via
  // the column visibility menu, so we override the default-true to default-false
  // until the user explicitly toggles it on.
  const { visibility: columnVisibility, order: columnOrder } = useMemo(() => {
    const resolved = resolveColumnState(
      ordersPrefs?.visibility,
      ordersPrefs?.order,
      definedColumns,
      {
        pinnedLastIds: ["actions"],
        forcedVisibleIds: ["select", "order_number", "actions"],
      },
    );
    // The tags column should default to hidden when the user has not yet
    // expressed a preference. Existing user prefs (true|false) are preserved.
    if (ordersPrefs?.visibility?.tags === undefined) {
      resolved.visibility = { ...resolved.visibility, tags: false };
    }
    // The assigned_user column likewise defaults to hidden until the user
    // opts in via the column visibility menu.
    if (ordersPrefs?.visibility?.assigned_user === undefined) {
      resolved.visibility = { ...resolved.visibility, assigned_user: false };
    }
    if (ordersPrefs?.visibility?.source === undefined) {
      resolved.visibility = { ...resolved.visibility, source: false };
    }
    return resolved;
  }, [ordersPrefs, definedColumns]);

  const handleColumnVisibility = useCallback(
    (next: Record<string, boolean>) => {
      dispatch(setOrdersVisibility(next));
    },
    [dispatch],
  );

  const handleColumnOrder = useCallback(
    (next: string[]) => {
      dispatch(setOrdersOrder(next));
    },
    [dispatch],
  );

  const handleColumnReset = useCallback(() => {
    dispatch(resetOrders());
  }, [dispatch]);

  const {
    items: orders,
    meta,
    loading,
    error,
    counts,
    countsLoading,
    countsError,
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
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>(() =>
    parseSourceParam(searchParams.get("source")),
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Tag filter — hydrated from the URL on mount, written back on commit.
  const [tagIdsFilter, setTagIdsFilter] = useState<number[]>(() =>
    parseTagIdsParam(searchParams.get("tag_ids")),
  );

  // Assignee filter — hydrated from the URL on mount, written back on commit.
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilterValue>(
    () => parseAssigneeParam(searchParams.get("assigned_user_id")),
  );

  // Selection state — Set of selected order ids, used by BulkTagActions.
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(
    new Set(),
  );

  // Expanded row tracking — Set of expanded order ids
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setPage]);

  // Keep the tag filter in sync when the URL changes externally (e.g.,
  // back/forward navigation). The serialized form is canonical, so a
  // simple parse keeps us round-trip safe.
  useEffect(() => {
    const next = parseTagIdsParam(searchParams.get("tag_ids"));
    setTagIdsFilter((prev) => {
      if (
        prev.length === next.length &&
        prev.every((id, idx) => id === next[idx])
      ) {
        return prev;
      }
      return next;
    });
  }, [searchParams]);

  // Keep the assignee filter in sync when the URL changes externally (e.g.,
  // back/forward navigation). The serialized form is canonical, so comparing
  // serialized tokens keeps us round-trip safe.
  useEffect(() => {
    const next = parseAssigneeParam(searchParams.get("assigned_user_id"));
    setAssigneeFilter((prev) =>
      serializeAssigneeParam(prev) === serializeAssigneeParam(next)
        ? prev
        : next,
    );
  }, [searchParams]);

  useEffect(() => {
    const next = parseSourceParam(searchParams.get("source"));
    setSourceFilter((prev) =>
      serializeSourceParam(prev) === serializeSourceParam(next) ? prev : next,
    );
  }, [searchParams]);

  // Pre-warm the eligible-assignees cache so the AssigneeFilter has data ready.
  // The thunk is idempotent (60s TTL), so dispatching on store change is safe.
  useEffect(() => {
    if (!currentStoreId) return;
    dispatch(fetchEligibleAssignees(currentStoreId));
  }, [dispatch, currentStoreId]);

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

    if (sourceFilter.kind === "channels") {
      params.source = sourceFilter.channels;
    }

    if (tagIdsFilter.length > 0) {
      // Backend accepts comma-separated ids on the same query parameter.
      params.tag_ids = serializeTagIdsParam(tagIdsFilter) ?? undefined;
    }

    const assigneeToken = serializeAssigneeParam(assigneeFilter);
    if (assigneeToken !== null) {
      params.assigned_user_id = assigneeToken;
    }

    dispatch(
      fetchOrders({
        storeId: currentStoreId,
        params: params as Record<string, unknown>,
      }),
    );

    // Build counts params: same filters EXCEPT status, page, limit, sort_by, sort_order
    const countsParams: Record<string, unknown> = {};
    if (search.trim()) countsParams.search = search.trim();
    if (paymentStatusFilter !== "all")
      countsParams.payment_status = paymentStatusFilter;
    if (sourceFilter.kind === "channels")
      countsParams.source = sourceFilter.channels;
    if (tagIdsFilter.length > 0) {
      countsParams.tag_ids = serializeTagIdsParam(tagIdsFilter) ?? undefined;
    }
    if (assigneeToken !== null) {
      // Keep the per-status tabs in sync with the list (Requirement 9.4).
      countsParams.assigned_user_id = assigneeToken;
    }

    dispatch(
      fetchOrderCounts({
        storeId: currentStoreId,
        params: countsParams,
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
    tagIdsFilter,
    assigneeFilter,
  ]);

  // Drop selected ids that are no longer visible in the current page.
  // Bulk operations only target ids the user can currently see.
  useEffect(() => {
    if (selectedOrderIds.size === 0) return;
    const visible = new Set(orders.map((order) => order.id));
    let mutated = false;
    const next = new Set<number>();
    for (const id of selectedOrderIds) {
      if (visible.has(id)) {
        next.add(id);
      } else {
        mutated = true;
      }
    }
    if (mutated) setSelectedOrderIds(next);
  }, [orders, selectedOrderIds]);

  // Push tag-filter changes to the URL. Empty selection removes the param.
  const commitTagIdsFilter = useCallback(
    (next: number[]) => {
      setTagIdsFilter(next);
      setPage(1);

      const params = new URLSearchParams(searchParams.toString());
      const serialized = serializeTagIdsParam(next);
      if (serialized) {
        params.set("tag_ids", serialized);
      } else {
        params.delete("tag_ids");
      }

      const query = params.toString();
      const path = query ? `?${query}` : "";
      router.replace(path === "" ? window.location.pathname : path, {
        scroll: false,
      });
    },
    [router, searchParams, setPage],
  );

  // Push assignee-filter changes to the URL. A "none" selection removes the
  // param. Mirrors commitTagIdsFilter so both filters share one history model.
  const commitAssigneeFilter = useCallback(
    (next: AssigneeFilterValue) => {
      setAssigneeFilter(next);
      setPage(1);

      const params = new URLSearchParams(searchParams.toString());
      const serialized = serializeAssigneeParam(next);
      if (serialized !== null) {
        params.set("assigned_user_id", serialized);
      } else {
        params.delete("assigned_user_id");
      }

      const query = params.toString();
      const path = query ? `?${query}` : "";
      router.replace(path === "" ? window.location.pathname : path, {
        scroll: false,
      });
    },
    [router, searchParams, setPage],
  );

  const commitSourceFilter = useCallback(
    (next: SourceFilterValue) => {
      setSourceFilter(next);
      setPage(1);

      const params = new URLSearchParams(searchParams.toString());
      const serialized = serializeSourceParam(next);
      if (serialized !== null) {
        params.set("source", serialized);
      } else {
        params.delete("source");
      }

      const query = params.toString();
      const path = query ? `?${query}` : "";
      router.replace(path === "" ? window.location.pathname : path, {
        scroll: false,
      });
    },
    [router, searchParams, setPage],
  );

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

  // Toggle inline row expansion. Stops the wrapping <tr> click from firing,
  // so the row navigation does NOT trigger when expanding/collapsing.
  const handleToggleExpand = useCallback(
    (event: MouseEvent<HTMLButtonElement>, orderId: number) => {
      event.stopPropagation();
      setExpandedRows((prev) => {
        const next = new Set(prev);
        if (next.has(orderId)) {
          next.delete(orderId);
        } else {
          next.add(orderId);
        }
        return next;
      });
    },
    [],
  );

  // Whole-row navigation to the order detail page
  const handleRowClick = useCallback(
    (order: Order) => {
      router.push(`/admin/orders/${order.id}`);
    },
    [router],
  );

  const toggleRowSelection = useCallback((orderId: number) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  const togglePageSelection = useCallback(() => {
    setSelectedOrderIds((prev) => {
      const visibleIds = orders.map((order) => order.id);
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }, [orders]);

  const handleBulkComplete = useCallback(() => {
    setSelectedOrderIds(new Set());
    if (!currentStoreId) return;

    const params: Record<string, unknown> = { page, limit };
    if (sortBy) {
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
    }
    if (search.trim()) params.search = search.trim();
    if (statusFilter !== "all") params.status = statusFilter;
    if (paymentStatusFilter !== "all")
      params.payment_status = paymentStatusFilter;
    if (sourceFilter.kind === "channels") params.source = sourceFilter.channels;
    if (tagIdsFilter.length > 0) {
      params.tag_ids = serializeTagIdsParam(tagIdsFilter) ?? undefined;
    }
    const assigneeToken = serializeAssigneeParam(assigneeFilter);
    if (assigneeToken !== null) {
      params.assigned_user_id = assigneeToken;
    }
    dispatch(fetchOrders({ storeId: currentStoreId, params }));
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
    tagIdsFilter,
    assigneeFilter,
  ]);

  // Predicate consumed by DataTable
  const isRowExpanded = useCallback(
    (order: Order) => expandedRows.has(order.id),
    [expandedRows],
  );

  // Render-prop consumed by DataTable
  const renderRowExpansion = useCallback(
    (order: Order) => <OrderRowExpansion order={order} locale={locale} />,
    [locale],
  );

  const headerSelectionState = useMemo(() => {
    if (orders.length === 0) return false;
    const allSelected = orders.every((order) => selectedOrderIds.has(order.id));
    if (allSelected) return true;
    const someSelected = orders.some((order) => selectedOrderIds.has(order.id));
    return someSelected ? "indeterminate" : false;
  }, [orders, selectedOrderIds]);

  // Table columns definition
  const columns: ColumnDef<Order, unknown>[] = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <Checkbox
            checked={headerSelectionState}
            onCheckedChange={() => togglePageSelection()}
            aria-label={
              locale === "ar"
                ? "تحديد كل الطلبات الظاهرة"
                : "Select all visible orders"
            }
            onClick={(event) => event.stopPropagation()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedOrderIds.has(row.original.id)}
            onCheckedChange={() => toggleRowSelection(row.original.id)}
            onClick={(event) => event.stopPropagation()}
            aria-label={
              locale === "ar"
                ? `تحديد الطلب ${row.original.order_number}`
                : `Select order ${row.original.order_number}`
            }
          />
        ),
      },
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
          return <SourceBadge source={row.original.source} />;
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
        id: "tags",
        accessorKey: "tags",
        header: locale === "ar" ? "الوسوم" : "Tags",
        enableSorting: false,
        cell: ({ row }) => {
          const tags = row.original.tags ?? [];
          if (tags.length === 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex max-w-xs flex-wrap gap-1">
              {tags.map((tag) => (
                <TagChip
                  key={tag.id}
                  name={tag.name}
                  color_preset={tag.color_preset}
                  size="sm"
                />
              ))}
            </div>
          );
        },
      },
      {
        id: "assigned_user",
        accessorKey: "assigned_user",
        header: locale === "ar" ? "المسؤول" : "Assignee",
        enableSorting: false,
        cell: ({ row }) => {
          const assignee = row.original.assigned_user;
          if (!assignee) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return <AssigneeChip assignee={assignee} size="sm" />;
        },
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
        cell: ({ row }) => {
          const expanded = expandedRows.has(row.original.id);
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => handleToggleExpand(e, row.original.id)}
              aria-label={
                expanded
                  ? locale === "ar"
                    ? "طي التفاصيل"
                    : "Collapse details"
                  : locale === "ar"
                    ? "عرض التفاصيل"
                    : "Expand details"
              }
              aria-expanded={expanded}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </Button>
          );
        },
      },
    ],
    [
      locale,
      expandedRows,
      handleToggleExpand,
      headerSelectionState,
      selectedOrderIds,
      toggleRowSelection,
      togglePageSelection,
    ],
  );

  void tA11y;

  const selectedOrderIdsArray = useMemo(
    () => Array.from(selectedOrderIds),
    [selectedOrderIds],
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

      {/* Status Tabs */}
      <OrderStatusTabs
        value={statusFilter as OrderStatusTabValue}
        counts={counts}
        loading={countsLoading}
        error={countsError}
        locale={locale}
        onChange={(next) => {
          setStatusFilter(next);
          setPage(1);
        }}
      />

      {/* Bulk action bar — only renders when one or more rows are selected */}
      {selectedOrderIdsArray.length > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-accent/30 p-3">
          <BulkTagActions
            selectedOrderIds={selectedOrderIdsArray}
            onComplete={handleBulkComplete}
            locale={locale}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedOrderIds(new Set())}
          >
            {locale === "ar" ? "إلغاء التحديد" : "Clear selection"}
          </Button>
        </div>
      )}

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

        {/* Source filter — multi-select with URL state */}
        <SourceFilter
          value={sourceFilter}
          onChange={commitSourceFilter}
          locale={locale}
        />

        {/* Tags filter — multi-select with URL state */}
        <OrderTagsFilter
          value={tagIdsFilter}
          onChange={commitTagIdsFilter}
          locale={locale}
        />

        {/* Assignee filter — permission-gated internally; multi-select w/ URL state */}
        <AssigneeFilter
          value={assigneeFilter}
          onChange={commitAssigneeFilter}
          locale={locale}
        />

        {/* Customize columns menu */}
        <ColumnVisibilityMenu
          columns={definedColumns}
          visibility={columnVisibility}
          order={columnOrder}
          onVisibilityChange={handleColumnVisibility}
          onOrderChange={handleColumnOrder}
          onReset={handleColumnReset}
          locale={locale}
          pinnedLastIds={["actions"]}
          forcedVisibleIds={["select", "order_number", "actions"]}
        />
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
        columnVisibility={columnVisibility}
        columnOrder={columnOrder}
        onColumnVisibilityChange={handleColumnVisibility}
        onColumnOrderChange={handleColumnOrder}
        onRowClick={handleRowClick}
        isRowExpanded={isRowExpanded}
        renderRowExpansion={renderRowExpansion}
      />
    </div>
  );
}
