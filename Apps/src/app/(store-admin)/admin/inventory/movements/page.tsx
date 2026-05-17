"use client";

/**
 * Inventory Movements Page
 * Displays a paginated table of inventory movements sorted by date descending.
 * Supports filtering by movement type and date range.
 *
 * Requirements: 9.2
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchInventoryMovements } from "@/lib/store/slices/inventory.thunks";
import { usePagination } from "@/hooks/usePagination";
import { useStore } from "@/hooks/useStore";
import type {
  PaginationParams,
  InventoryMovement,
  InventoryMovementType,
} from "@/types";

// ─── Movement Type Badge ─────────────────────────────────────────────────────

const MOVEMENT_TYPE_STYLES: Record<InventoryMovementType, string> = {
  IN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ADJUSTMENT_IN:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  OUT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ADJUSTMENT_OUT:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  RESERVED:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  RELEASED:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  RETURNED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function MovementTypeBadge({
  type,
  label,
}: {
  type: InventoryMovementType;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${MOVEMENT_TYPE_STYLES[type]}`}
    >
      {label}
    </span>
  );
}

// ─── Movements Page ──────────────────────────────────────────────────────────

export default function InventoryMovementsPage() {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("inventory.movements");
  const tInv = useTranslations("inventory");

  const { movements, movementsMeta, loading, error } = useAppSelector(
    (state) => state.inventory,
  );

  const { page, limit, setPage, setLimit } = usePagination(1, 20);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Movement type options for filter
  const movementTypeOptions: { value: string; label: string }[] = useMemo(
    () => [
      { value: "all", label: t("allTypes") },
      { value: "IN", label: tInv("typeIn") },
      { value: "ADJUSTMENT_IN", label: tInv("typeAdjustmentIn") },
      { value: "OUT", label: tInv("typeOut") },
      { value: "ADJUSTMENT_OUT", label: tInv("typeAdjustmentOut") },
      { value: "RESERVED", label: t("typeReserved") },
      { value: "RELEASED", label: t("typeReleased") },
      { value: "RETURNED", label: t("typeReturned") },
    ],
    [t, tInv],
  );

  // Get translated label for a movement type
  const getTypeLabel = useCallback(
    (type: InventoryMovementType): string => {
      const option = movementTypeOptions.find((o) => o.value === type);
      return option?.label ?? type;
    },
    [movementTypeOptions],
  );

  // Fetch movements when params or filters change
  useEffect(() => {
    if (!currentStoreId) return;

    const fetchParams: Record<string, unknown> = {
      page,
      limit,
      sortBy: "created_at",
      sortOrder: "desc",
    };

    if (typeFilter && typeFilter !== "all") {
      fetchParams.type = typeFilter;
    }

    if (dateFrom) {
      fetchParams.from_date = new Date(dateFrom).toISOString();
    }

    if (dateTo) {
      // Set to end of day
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      fetchParams.to_date = endDate.toISOString();
    }

    dispatch(
      fetchInventoryMovements({
        storeId: currentStoreId,
        params: fetchParams as PaginationParams,
      }),
    );
  }, [dispatch, currentStoreId, page, limit, typeFilter, dateFrom, dateTo]);

  // Reset page when filters change
  const handleTypeFilterChange = useCallback(
    (value: string) => {
      setTypeFilter(value);
      setPage(1);
    },
    [setPage],
  );

  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDateFrom(e.target.value);
      setPage(1);
    },
    [setPage],
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDateTo(e.target.value);
      setPage(1);
    },
    [setPage],
  );

  const handleClearFilters = useCallback(() => {
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, [setPage]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    if (!currentStoreId) return;
    dispatch(
      fetchInventoryMovements({
        storeId: currentStoreId,
        params: { page, limit } as PaginationParams,
      }),
    );
  }, [dispatch, currentStoreId, page, limit]);

  // Format date for display
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }, []);

  // Table columns definition
  const columns: ColumnDef<InventoryMovement, unknown>[] = useMemo(
    () => [
      {
        id: "type",
        accessorKey: "type",
        header: t("headerType"),
        enableSorting: false,
        cell: ({ row }) => (
          <MovementTypeBadge
            type={row.original.type}
            label={getTypeLabel(row.original.type)}
          />
        ),
      },
      {
        id: "product",
        header: t("headerProduct"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.variant?.product?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "variant",
        header: t("headerVariant"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.variant?.title ?? "—"}
          </span>
        ),
      },
      {
        id: "quantity_change",
        accessorKey: "quantity_change",
        header: t("headerQuantity"),
        enableSorting: false,
        cell: ({ row }) => {
          const qty = row.original.quantity_change;
          const isPositive = [
            "IN",
            "ADJUSTMENT_IN",
            "RELEASED",
            "RETURNED",
          ].includes(row.original.type);
          return (
            <span
              className={`font-medium ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {isPositive ? "+" : "-"}
              {Math.abs(qty)}
            </span>
          );
        },
      },
      {
        id: "reason",
        accessorKey: "reason",
        header: t("headerReason"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
            {row.original.reason || "—"}
          </span>
        ),
      },
      {
        id: "actor",
        header: t("headerPerformedBy"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.actor?.name ?? "—"}</span>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: t("headerDate"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
    ],
    [t, getTypeLabel, formatDate],
  );

  const hasActiveFilters = typeFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        {/* Type filter */}
        <div className="space-y-1.5">
          <Label htmlFor="type-filter">{t("filterType")}</Label>
          <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
            <SelectTrigger id="type-filter" className="w-[200px]">
              <SelectValue placeholder={t("allTypes")} />
            </SelectTrigger>
            <SelectContent>
              {movementTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date from */}
        <div className="space-y-1.5">
          <Label htmlFor="date-from">{t("filterDateFrom")}</Label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={handleDateFromChange}
            className="w-[180px]"
            aria-label={t("filterDateFrom")}
          />
        </div>

        {/* Date to */}
        <div className="space-y-1.5">
          <Label htmlFor="date-to">{t("filterDateTo")}</Label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={handleDateToChange}
            className="w-[180px]"
            aria-label={t("filterDateTo")}
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            aria-label={t("clearFilters")}
          >
            {t("clearFilters")}
          </Button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={movements}
        meta={movementsMeta}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onRetry={handleRetry}
        emptyMessage={t("emptyMessage")}
        emptyIcon={<ArrowLeftRight className="h-12 w-12" />}
      />
    </div>
  );
}
