"use client";

/**
 * Order Tag Settings Page
 *
 * `/admin/settings/order-tags`
 *
 * Lists every tag defined for the current store with assignment counts and
 * provides create / edit / delete affordances. Lazy-fetches tags with
 * `with_counts=true` on mount so the UI can show how many orders each tag
 * is attached to (and warn the user during deletion).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  deleteOrderTag,
  fetchOrderTags,
} from "@/lib/store/slices/orderTags.thunks";
import { useStore } from "@/hooks/useStore";
import { formatDate } from "@/lib/utils/formatDate";

import { TagChip } from "@/components/orders/TagChip";
import { TagFormDialog } from "@/components/orders/TagFormDialog";
import type { OrderTag } from "@/types/orderTag.types";

export default function OrderTagsSettingsPage() {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("orderTags");

  const tags = useAppSelector((state) => state.orderTags.tags);
  const loading = useAppSelector((state) => state.orderTags.loading);
  const countsLoaded = useAppSelector((state) => state.orderTags.countsLoaded);

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    tag?: OrderTag;
  }>({ open: false, mode: "create" });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    tag: OrderTag | null;
  }>({ open: false, tag: null });

  const [deleting, setDeleting] = useState(false);

  // Fetch tags with counts once per mount. Admins expect fresh numbers when
  // they revisit the settings page after assignments change elsewhere, so
  // this *should* run on mount, but we use a ref guard to make sure React's
  // StrictMode double-invocation doesn't double-fetch and to avoid the
  // infinite-loop pattern that affected the picker (see slice `loaded`).
  const fetchedOnceRef = useRef(false);
  useEffect(() => {
    if (!currentStoreId || fetchedOnceRef.current) return;
    fetchedOnceRef.current = true;
    dispatch(fetchOrderTags({ storeId: currentStoreId, withCounts: true }));
  }, [dispatch, currentStoreId]);

  const columns: ColumnDef<OrderTag, unknown>[] = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("page.table.name"),
        cell: ({ row }) => (
          <TagChip
            name={row.original.name}
            color_preset={row.original.color_preset}
          />
        ),
      },
      {
        id: "assignment_count",
        accessorKey: "assignment_count",
        header: t("page.table.assignmentCount"),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.assignment_count ?? 0}
          </span>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: t("page.table.createdAt"),
        cell: ({ row }) =>
          row.original.created_at ? formatDate(row.original.created_at) : "—",
      },
      {
        id: "actions",
        header: t("page.table.actions"),
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setFormDialog({
                  open: true,
                  mode: "edit",
                  tag: row.original,
                })
              }
              aria-label={t("card.edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteDialog({ open: true, tag: row.original })}
              aria-label={t("delete.title")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: tags,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleDelete = async () => {
    if (!currentStoreId || !deleteDialog.tag) return;
    setDeleting(true);
    try {
      await dispatch(
        deleteOrderTag({
          storeId: currentStoreId,
          tagId: deleteDialog.tag.id,
        }),
      ).unwrap();
      toast.success(t("toasts.deleteSuccess"));
      setDeleteDialog({ open: false, tag: null });
      // Re-fetch to keep counts honest after the delete cascades clear.
      dispatch(fetchOrderTags({ storeId: currentStoreId, withCounts: true }));
    } catch (error: unknown) {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "";
      const upper = message.toUpperCase();
      if (upper.includes("TAG_NOT_FOUND")) {
        toast.error(t("errors.TAG_NOT_FOUND"));
      } else if (upper.includes("FORBIDDEN")) {
        toast.error(t("errors.FORBIDDEN"));
      } else {
        toast.error(t("toasts.errorGeneric"));
      }
    } finally {
      setDeleting(false);
    }
  };

  const showSkeleton = loading && tags.length === 0;
  const showEmpty = !loading && tags.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("page.title")}
          </h2>
          <p className="text-muted-foreground">{t("page.description")}</p>
        </div>
        <Button onClick={() => setFormDialog({ open: true, mode: "create" })}>
          <Plus className="me-2 h-4 w-4" />
          {t("page.createButton")}
        </Button>
      </div>

      {showSkeleton ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : showEmpty ? (
        <EmptyState
          icon={<TagIcon className="h-8 w-8 text-muted-foreground" />}
          title={t("page.emptyState.title")}
          description={t("page.emptyState.description")}
          action={{
            label: t("page.createButton"),
            onClick: () => setFormDialog({ open: true, mode: "create" }),
          }}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* `countsLoaded` is true after the with_counts fetch completes;
              while it's pending the table still renders rows but the count
              column may show 0. The skeleton above covers the empty case. */}
          {!countsLoaded && loading && (
            <div className="border-t p-2 text-center text-xs text-muted-foreground">
              {t("picker.loading")}
            </div>
          )}
        </div>
      )}

      <TagFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((prev) => ({ ...prev, open }))}
        mode={formDialog.mode}
        tag={formDialog.tag}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title={t("delete.title")}
        description={t("delete.description", {
          name: deleteDialog.tag?.name ?? "",
          count: deleteDialog.tag?.assignment_count ?? 0,
        })}
        confirmLabel={t("delete.confirm")}
        cancelLabel={t("delete.cancel")}
        onConfirm={handleDelete}
        destructive
        loading={deleting}
      />
    </div>
  );
}
