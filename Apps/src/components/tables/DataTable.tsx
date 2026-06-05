"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown, AlertCircle } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { PaginationMeta } from "@/types";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  meta: PaginationMeta | null;
  loading?: boolean;
  error?: string | null;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  /** Controlled column visibility (TanStack `state.columnVisibility`). */
  columnVisibility?: Record<string, boolean>;
  /** Controlled column order (TanStack `state.columnOrder`). */
  columnOrder?: string[];
  /** Called with the next visibility record after a TanStack-internal change. */
  onColumnVisibilityChange?: (next: Record<string, boolean>) => void;
  /** Called with the next order array after a TanStack-internal change. */
  onColumnOrderChange?: (next: string[]) => void;
  /**
   * Called when a user clicks anywhere on a data row (excluding interactive
   * children that call `event.stopPropagation()`). Use for whole-row navigation.
   */
  onRowClick?: (row: TData) => void;
  /**
   * Predicate that decides whether a given row is currently expanded.
   * When `renderRowExpansion` is provided AND this returns `true`,
   * the table renders a second `<tr>` underneath the row containing the
   * expansion content.
   */
  isRowExpanded?: (row: TData) => boolean;
  /**
   * Render-prop used to produce the expansion content for an expanded row.
   * Only invoked when `isRowExpanded(row) === true`. The content is rendered
   * inside a single `<td colSpan={visibleColumns.length}>` cell.
   */
  renderRowExpansion?: (row: TData) => React.ReactNode;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * DataTable — Generic reusable table component powered by TanStack Table.
 * Supports server-side pagination, column sorting, loading/empty/error states,
 * page size selector, and confirmation dialog for delete actions.
 *
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7
 */
export function DataTable<TData>({
  columns,
  data,
  meta,
  loading = false,
  error = null,
  onPageChange,
  onLimitChange,
  onSortChange,
  onRetry,
  emptyMessage,
  emptyIcon,
  columnVisibility,
  columnOrder,
  onColumnVisibilityChange,
  onColumnOrderChange,
  onRowClick,
  isRowExpanded,
  renderRowExpansion,
}: DataTableProps<TData>) {
  const t = useTranslations("table");
  const tCommon = useTranslations("common");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    onConfirm: (() => void) | null;
  }>({ open: false, onConfirm: null });

  /**
   * Translates a TanStack `Updater<T>` (which can be either a function or a
   * direct value) into a plain `T`, then forwards to the consumer callback.
   * Used to bridge controlled column-visibility / column-order props.
   */
  const tanstackUpdater =
    <T,>(current: T, cb?: (next: T) => void) =>
    (updaterOrValue: T | ((old: T) => T)) => {
      const next =
        typeof updaterOrValue === "function"
          ? (updaterOrValue as (old: T) => T)(current)
          : updaterOrValue;
      cb?.(next);
    };

  // Build TanStack state and handlers conditionally so that omitted column
  // props leave the table fully uncontrolled (preserves existing behavior).
  const tableState: Parameters<typeof useReactTable>[0]["state"] = {
    sorting,
    ...(columnVisibility !== undefined ? { columnVisibility } : {}),
    ...(columnOrder !== undefined ? { columnOrder } : {}),
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    state: tableState,
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      setSorting(newSorting);

      if (newSorting.length > 0) {
        const { id, desc } = newSorting[0];
        onSortChange?.(id, desc ? "desc" : "asc");
      } else {
        onSortChange?.("", "asc");
      }
    },
    ...(columnVisibility !== undefined && {
      onColumnVisibilityChange: tanstackUpdater(
        columnVisibility,
        onColumnVisibilityChange,
      ),
    }),
    ...(columnOrder !== undefined && {
      onColumnOrderChange: tanstackUpdater(columnOrder, onColumnOrderChange),
    }),
    rowCount: meta?.total ?? 0,
  });

  const currentPage = meta?.page ?? 1;
  const totalPages = meta?.totalPages ?? 1;
  const currentLimit = meta?.limit ?? 20;
  const totalRecords = meta?.total ?? 0;

  const handlePageChange = useCallback(
    (page: number) => {
      onPageChange?.(page);
    },
    [onPageChange],
  );

  const handleLimitChange = useCallback(
    (value: string) => {
      onLimitChange?.(Number(value));
    },
    [onLimitChange],
  );

  // Expose delete confirmation trigger via table meta
  const openDeleteConfirm = useCallback((onConfirm: () => void) => {
    setDeleteConfirm({ open: true, onConfirm });
  }, []);

  // Error state
  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <p className="mb-4 text-sm text-destructive">{error}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            {tCommon("retry")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sorted === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              // Skeleton loading state matching page limit count
              Array.from({ length: currentLimit }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={`skeleton-${rowIndex}-${colIndex}`}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState icon={emptyIcon} message={emptyMessage} />
                </TableCell>
              </TableRow>
            ) : (
              // Data rows — supports optional expansion and whole-row click
              table.getRowModel().rows.map((row) => {
                const expanded = isRowExpanded?.(row.original) ?? false;
                const visibleCells = row.getVisibleCells();
                const clickable = Boolean(onRowClick);

                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      onClick={
                        clickable ? () => onRowClick?.(row.original) : undefined
                      }
                      className={
                        clickable
                          ? "cursor-pointer hover:bg-muted/50 transition-colors"
                          : undefined
                      }
                      data-state={expanded ? "expanded" : undefined}
                    >
                      {visibleCells.map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expanded && renderRowExpansion && (
                      <TableRow
                        data-state="expansion"
                        className="hover:bg-transparent"
                      >
                        <TableCell
                          colSpan={visibleCells.length}
                          className="p-0"
                        >
                          {renderRowExpansion(row.original)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {!loading && data.length > 0 && meta && (
        <div className="flex items-center justify-between px-2">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("perPage")}
            </span>
            <Select
              value={String(currentLimit)}
              onValueChange={handleLimitChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {t("of")} {totalRecords}
            </span>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              {tCommon("previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("page")} {currentPage} {t("of")} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              {tCommon("next")}
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm({ open: false, onConfirm: null });
          }
        }}
        onConfirm={() => {
          deleteConfirm.onConfirm?.();
          setDeleteConfirm({ open: false, onConfirm: null });
        }}
      />
    </div>
  );
}

/**
 * Utility: creates a delete action handler that triggers the confirmation dialog.
 * Pass this as part of your row actions to integrate with DataTable's built-in confirm dialog.
 */
export function createDeleteHandler(
  openDeleteConfirm: (onConfirm: () => void) => void,
  deleteAction: () => void,
) {
  return () => openDeleteConfirm(deleteAction);
}
