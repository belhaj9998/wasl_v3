"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ColumnDef } from "@tanstack/react-table";
import { Store as StoreIcon, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge, type StatusVariant } from "@/components/shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchPlatformStores,
  updatePlatformStoreStatus,
} from "@/lib/store/slices/platform.thunks";
import { usePagination } from "@/hooks/usePagination";
import { formatDate } from "@/lib/utils/formatDate";
import {
  STORE_STATUS,
  STORE_STATUS_TRANSITIONS,
  STORE_STATUS_LABELS,
  type StoreStatus,
} from "@/lib/constants/enums";
import { ROUTES } from "@/lib/constants/routes";
import type { Store } from "@/types";

/**
 * Platform Stores Management Page
 * Displays all stores with search, filter, pagination, and status change actions.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export default function PlatformStoresPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const t = useTranslations();
  const locale = useAppSelector((state) => state.ui.locale);

  const {
    items: stores,
    meta,
    loading,
    error,
  } = useAppSelector((state) => state.platform.stores);

  const {
    page,
    limit,
    sortBy,
    sortOrder,
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
    params,
  } = usePagination(1, 20);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch stores with current params
  const fetchStores = useCallback(() => {
    const fetchParams: Record<string, string> = {
      page: String(params.page),
      limit: String(params.limit),
    };
    if (params.sortBy) {
      fetchParams.sortBy = params.sortBy;
      fetchParams.sortOrder = params.sortOrder ?? "asc";
    }
    if (search.trim()) {
      fetchParams.search = search.trim();
    }
    if (statusFilter && statusFilter !== "all") {
      fetchParams.status = statusFilter;
    }
    dispatch(fetchPlatformStores(fetchParams));
  }, [dispatch, params, search, statusFilter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setPage]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (store: Store, newStatus: StoreStatus) => {
      try {
        await dispatch(
          updatePlatformStoreStatus({
            storeId: store.id,
            payload: {
              status: newStatus as "ACTIVE" | "SUSPENDED" | "ARCHIVED",
            },
          }),
        ).unwrap();
        toast.success(t("success.store.statusChanged"));
      } catch {
        toast.error(t("errors.store.invalidTransition"));
      }
    },
    [dispatch, t],
  );

  // Get status badge variant
  const getStatusVariant = (status: StoreStatus): StatusVariant => {
    switch (status) {
      case STORE_STATUS.ACTIVE:
        return "success";
      case STORE_STATUS.DRAFT:
        return "info";
      case STORE_STATUS.SUSPENDED:
        return "warning";
      case STORE_STATUS.ARCHIVED:
        return "neutral";
      default:
        return "neutral";
    }
  };

  // Get valid transitions for a store
  const getValidTransitions = (currentStatus: StoreStatus): StoreStatus[] => {
    return STORE_STATUS_TRANSITIONS[currentStatus] || [];
  };

  // All possible statuses for the dropdown (to show disabled ones)
  const allStatuses: StoreStatus[] = [
    STORE_STATUS.DRAFT,
    STORE_STATUS.ACTIVE,
    STORE_STATUS.SUSPENDED,
    STORE_STATUS.ARCHIVED,
  ];

  // Table columns
  const columns: ColumnDef<Store, unknown>[] = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: locale === "ar" ? "اسم المتجر" : "Store Name",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "domain",
        accessorKey: "domain",
        header: locale === "ar" ? "النطاق" : "Domain",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.domain}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: locale === "ar" ? "الحالة" : "Status",
        enableSorting: true,
        cell: ({ row }) => {
          const status = row.original.status as StoreStatus;
          const label = STORE_STATUS_LABELS[status]?.[locale] || status;
          return (
            <StatusBadge label={label} variant={getStatusVariant(status)} />
          );
        },
      },
      {
        id: "owner_name",
        header: locale === "ar" ? "المالك" : "Owner",
        enableSorting: false,
        cell: ({ row }) => <span>{row.original.owner?.name || "—"}</span>,
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: locale === "ar" ? "تاريخ الإنشاء" : "Created At",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: locale === "ar" ? "إجراءات" : "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const store = row.original;
          const currentStatus = store.status as StoreStatus;
          const validTransitions = getValidTransitions(currentStatus);

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("common.actions")}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* View detail */}
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`${ROUTES.PLATFORM.STORES}/${store.id}`)
                  }
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {locale === "ar" ? "عرض التفاصيل" : "View Details"}
                </DropdownMenuItem>

                {/* Status transitions */}
                {allStatuses.filter((s) => s !== currentStatus).length > 0 && (
                  <DropdownMenuSeparator />
                )}
                {allStatuses
                  .filter((s) => s !== currentStatus)
                  .map((targetStatus) => {
                    const isValid = validTransitions.includes(targetStatus);
                    const label =
                      STORE_STATUS_LABELS[targetStatus]?.[locale] ||
                      targetStatus;

                    return (
                      <DropdownMenuItem
                        key={targetStatus}
                        disabled={!isValid}
                        onClick={() => {
                          if (isValid) {
                            handleStatusChange(store, targetStatus);
                          }
                        }}
                      >
                        {locale === "ar"
                          ? `تغيير إلى: ${label}`
                          : `Change to: ${label}`}
                      </DropdownMenuItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [locale, t, router, handleStatusChange],
  );

  // Handle sort change from DataTable
  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      setSortBy(newSortBy || undefined);
      setSortOrder(newSortOrder);
    },
    [setSortBy, setSortOrder],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StoreIcon className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-2xl font-bold">
            {locale === "ar" ? "إدارة المتاجر" : "Stores Management"}
          </h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <Input
          placeholder={
            locale === "ar"
              ? "بحث بالاسم أو النطاق..."
              : "Search by name or domain..."
          }
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue
              placeholder={locale === "ar" ? "جميع الحالات" : "All Statuses"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {locale === "ar" ? "جميع الحالات" : "All Statuses"}
            </SelectItem>
            {Object.values(STORE_STATUS).map((status) => (
              <SelectItem key={status} value={status}>
                {STORE_STATUS_LABELS[status]?.[locale] || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={stores}
        meta={meta}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSortChange={handleSortChange}
        onRetry={fetchStores}
        emptyMessage={locale === "ar" ? "لا توجد متاجر" : "No stores found"}
        emptyIcon={<StoreIcon className="h-12 w-12" />}
      />
    </div>
  );
}
