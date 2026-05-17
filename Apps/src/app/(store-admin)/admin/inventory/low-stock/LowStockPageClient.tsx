"use client";

/**
 * Low Stock Inventory Page — Client Component
 * Displays a paginated table of inventory items where available_quantity <= low_stock_threshold.
 * Columns: product name, variant name, SKU, available quantity, low stock threshold, edit link.
 *
 * Requirements: 9.1
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";

import { useStore } from "@/hooks/useStore";
import { usePagination } from "@/hooks/usePagination";
import { inventoryService } from "@/lib/api/services/inventory.service";
import type { InventoryItem } from "@/lib/api/services/inventory.service";
import type { PaginationMeta } from "@/types";

export default function LowStockPageClient() {
  const { currentStoreId } = useStore();
  const t = useTranslations("inventory");
  const tCommon = useTranslations("common");

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

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch low stock items
  const fetchData = useCallback(async () => {
    if (!currentStoreId) return;

    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(Math.min(limit, 50)),
      };

      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;
      }

      const response = await inventoryService.getLowStock(
        currentStoreId,
        params,
      );

      setItems(response.data || []);
      setMeta(response.meta || null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("lowStock.fetchFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, page, limit, sortBy, sortOrder, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    fetchData();
  }, [fetchData]);

  // Table columns definition
  const columns: ColumnDef<InventoryItem, unknown>[] = useMemo(
    () => [
      {
        id: "product_name",
        accessorKey: "product_name",
        header: t("lowStock.headerProductName"),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.product_name}</span>
        ),
      },
      {
        id: "variant_title",
        accessorKey: "variant_title",
        header: t("lowStock.headerVariant"),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.variant_title}
          </span>
        ),
      },
      {
        id: "sku",
        accessorKey: "sku",
        header: "SKU",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.sku || "—"}</span>
        ),
      },
      {
        id: "available_quantity",
        accessorKey: "available_quantity",
        header: t("lowStock.headerQuantity"),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-destructive font-medium">
              {row.original.available_quantity}
            </span>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
        ),
      },
      {
        id: "low_stock_threshold",
        accessorKey: "low_stock_threshold",
        header: t("lowStock.headerThreshold"),
        enableSorting: true,
        cell: ({ row }) => row.original.low_stock_threshold,
      },
      {
        id: "actions",
        header: t("headerActions"),
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/admin/inventory?variant=${item.variant_id}`}
                aria-label={t("lowStock.editAriaLabel", {
                  product: item.product_name,
                  variant: item.variant_title,
                })}
              >
                <Pencil className="me-2 h-4 w-4" />
                {tCommon("edit")}
              </Link>
            </Button>
          );
        },
      },
    ],
    [t, tCommon],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("lowStock.title")}
          </h1>
          <p className="text-muted-foreground">{t("lowStock.description")}</p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={items}
        meta={meta}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSortChange={handleSortChange}
        onRetry={handleRetry}
        emptyMessage={t("lowStock.emptyMessage")}
        emptyIcon={<AlertTriangle className="h-12 w-12" />}
      />
    </div>
  );
}
