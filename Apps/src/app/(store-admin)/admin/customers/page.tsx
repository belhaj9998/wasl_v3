"use client";

/**
 * Customers List Page
 * Displays a paginated, searchable, filterable table of store customers.
 * Columns: name (first_name + last_name), email, phone, status (badge), total_orders, total_spent.
 * Supports search by name/email/phone and filter by status (ACTIVE, BLOCKED, ARCHIVED).
 * Pagination default 20, max 100.
 *
 * Requirements: 10.1
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Search, Users, Plus, MoreHorizontal, Eye } from "lucide-react";

import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchCustomers } from "@/lib/store/slices/customers.thunks";
import { usePagination } from "@/hooks/usePagination";
import { useStore } from "@/hooks/useStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { Customer, CustomerStatus, PaginationParams } from "@/types";
import type { StatusVariant } from "@/components/shared/StatusBadge";

// Customer status labels (Arabic)
const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  ACTIVE: "نشط",
  BLOCKED: "محظور",
  ARCHIVED: "مؤرشف",
};

// Customer status badge variant mapping
const CUSTOMER_STATUS_VARIANT_MAP: Record<CustomerStatus, StatusVariant> = {
  ACTIVE: "success",
  BLOCKED: "error",
  ARCHIVED: "warning",
};

export default function CustomersListPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentStoreId } = useStore();

  const {
    items: customers,
    meta,
    loading,
    error,
  } = useAppSelector((state) => state.customers);

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

  // Search and filter state
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch customers when params change
  useEffect(() => {
    if (!currentStoreId) return;

    const fetchParams: Record<string, unknown> = {
      page,
      limit,
    };

    if (sortBy) {
      fetchParams.sortBy = sortBy;
      fetchParams.sortOrder = sortOrder;
    }

    if (search.trim()) {
      fetchParams.search = search.trim();
    }

    if (statusFilter !== "all") {
      fetchParams.status = statusFilter;
    }

    dispatch(
      fetchCustomers({
        storeId: currentStoreId,
        params: fetchParams as PaginationParams,
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
  ]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setPage]);

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
    dispatch(
      fetchCustomers({ storeId: currentStoreId, params: { page, limit } }),
    );
  }, [dispatch, currentStoreId, page, limit]);

  // Table columns definition
  const columns: ColumnDef<Customer, unknown>[] = useMemo(
    () => [
      {
        id: "name",
        header: "الاسم",
        enableSorting: true,
        accessorFn: (row) =>
          [row.first_name, row.last_name].filter(Boolean).join(" "),
      },
      {
        id: "email",
        accessorKey: "email",
        header: "البريد الإلكتروني",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.email || "—"}
          </span>
        ),
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "الهاتف",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground" dir="ltr">
            {row.original.phone || "—"}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "الحالة",
        enableSorting: false,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <StatusBadge
              label={CUSTOMER_STATUS_LABELS[status]}
              variant={CUSTOMER_STATUS_VARIANT_MAP[status]}
            />
          );
        },
      },
      {
        id: "total_orders",
        accessorKey: "total_orders",
        header: "الطلبات",
        enableSorting: true,
        cell: ({ row }) => <span>{row.original.total_orders}</span>,
      },
      {
        id: "total_spent",
        accessorKey: "total_spent",
        header: "إجمالي الإنفاق",
        enableSorting: true,
        cell: ({ row }) => formatCurrency(row.original.total_spent),
      },
      {
        id: "actions",
        header: "الإجراءات",
        enableSorting: false,
        cell: ({ row }) => {
          const customer = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">إجراءات</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`/admin/customers/${customer.id}`)}
                >
                  <Eye className="me-2 h-4 w-4" />
                  عرض التفاصيل
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">العملاء</h2>
          <p className="text-muted-foreground">إدارة عملاء متجرك</p>
        </div>
        <Button onClick={() => router.push("/admin/customers/new")}>
          <Plus className="me-2 h-4 w-4" />
          إضافة عميل
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم، البريد، أو الهاتف..."
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
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="ACTIVE">
              {CUSTOMER_STATUS_LABELS.ACTIVE}
            </SelectItem>
            <SelectItem value="BLOCKED">
              {CUSTOMER_STATUS_LABELS.BLOCKED}
            </SelectItem>
            <SelectItem value="ARCHIVED">
              {CUSTOMER_STATUS_LABELS.ARCHIVED}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={customers}
        meta={meta}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSortChange={handleSortChange}
        onRetry={handleRetry}
        emptyMessage="لا يوجد عملاء"
        emptyIcon={<Users className="h-12 w-12" />}
      />
    </div>
  );
}
