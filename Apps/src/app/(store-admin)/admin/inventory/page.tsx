"use client";

/**
 * Inventory Management Page
 * Displays a paginated table of inventory levels with adjustment dialog.
 * Columns: product/variant name, SKU, available_quantity, total_quantity, reserved_quantity, low_stock_threshold.
 *
 * Requirements: 12.1, 12.3, 12.4, 12.5
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { Warehouse, PackagePlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FormField } from "@/components/forms/FormField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchInventory,
  adjustInventory,
} from "@/lib/store/slices/inventory.thunks";
import { usePagination } from "@/hooks/usePagination";
import { useStore } from "@/hooks/useStore";
import {
  inventoryAdjustmentSchema,
  type InventoryAdjustmentFormData,
} from "@/lib/validators/inventory.schema";
import type { PaginationParams } from "@/types";
import type { InventoryItem } from "@/lib/api/services/inventory.service";

// ─── Adjustment Dialog ───────────────────────────────────────────────────────

interface AdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSubmit: (data: InventoryAdjustmentFormData) => Promise<void>;
  isSubmitting: boolean;
}

function AdjustmentDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isSubmitting,
}: AdjustmentDialogProps) {
  const t = useTranslations("inventory");
  const tCommon = useTranslations("common");
  const { control, handleSubmit, reset, watch } =
    useForm<InventoryAdjustmentFormData>({
      resolver: zodResolver(inventoryAdjustmentSchema),
      defaultValues: {
        type: "IN",
        quantity_change: 1,
        reason: "",
      },
    });

  const adjustmentType = watch("type");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      reset({
        type: "IN",
        quantity_change: 1,
        reason: "",
      });
    }
  }, [open, reset]);

  // Client-side validation for OUT types: quantity_change must not exceed available_quantity
  const handleFormSubmit = useCallback(
    async (data: InventoryAdjustmentFormData) => {
      if (
        item &&
        (data.type === "OUT" || data.type === "ADJUSTMENT_OUT") &&
        data.quantity_change > item.available_quantity
      ) {
        toast.error(
          t("quantityExceeded", {
            requested: data.quantity_change,
            available: item.available_quantity,
          }),
        );
        return;
      }
      await onSubmit(data);
    },
    [item, onSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t("adjustTitle")}</DialogTitle>
          <DialogDescription>
            {item
              ? `${item.product_name} — ${item.variant_title} (${item.sku})`
              : t("adjustDescription")}
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>{t("availableQuantity")}</span>
              <span className="font-medium text-foreground">
                {item.available_quantity}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t("totalQuantity")}</span>
              <span className="font-medium text-foreground">
                {item.total_quantity}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t("reservedQuantity")}</span>
              <span className="font-medium text-foreground">
                {item.reserved_quantity}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Type */}
          <FormField
            control={control}
            name="type"
            label={t("adjustmentType")}
            type="select"
            options={[
              { value: "IN", label: t("typeIn") },
              { value: "ADJUSTMENT_IN", label: t("typeAdjustmentIn") },
              { value: "OUT", label: t("typeOut") },
              {
                value: "ADJUSTMENT_OUT",
                label: t("typeAdjustmentOut"),
              },
            ]}
            required
          />

          {/* Quantity */}
          <FormField
            control={control}
            name="quantity_change"
            label={t("quantity")}
            type="number"
            placeholder={t("quantityPlaceholder")}
            required
            description={
              (adjustmentType === "OUT" ||
                adjustmentType === "ADJUSTMENT_OUT") &&
              item
                ? t("maxQuantity", { max: item.available_quantity })
                : undefined
            }
          />

          {/* Reason */}
          <FormField
            control={control}
            name="reason"
            label={t("reason")}
            type="textarea"
            placeholder={t("reasonPlaceholder")}
          />

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <SubmitButton isSubmitting={isSubmitting}>
              {t("confirmAdjust")}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inventory Page ──────────────────────────────────────────────────────────

export default function InventoryPage() {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const tInv = useTranslations("inventory");
  const tSuccess = useTranslations("success");

  const {
    items: inventoryItems,
    meta,
    loading,
    error,
  } = useAppSelector((state) => state.inventory);

  const {
    page,
    limit,
    sortBy,
    sortOrder,
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
  } = usePagination(1, 50);

  // Adjustment dialog state
  const [adjustDialog, setAdjustDialog] = useState<{
    open: boolean;
    item: InventoryItem | null;
  }>({ open: false, item: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch inventory when params change
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

    dispatch(
      fetchInventory({
        storeId: currentStoreId,
        params: fetchParams as PaginationParams,
      }),
    );
  }, [dispatch, currentStoreId, page, limit, sortBy, sortOrder]);

  // Handle sort change from DataTable
  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      setSortBy(newSortBy || undefined);
      setSortOrder(newSortOrder);
    },
    [setSortBy, setSortOrder],
  );

  // Handle adjustment submit
  const handleAdjustSubmit = useCallback(
    async (data: InventoryAdjustmentFormData) => {
      if (!currentStoreId || !adjustDialog.item) return;

      setIsSubmitting(true);
      try {
        await dispatch(
          adjustInventory({
            storeId: currentStoreId,
            variantId: adjustDialog.item.variant_id,
            payload: {
              type: data.type,
              quantity_change: data.quantity_change,
              reason: data.reason || undefined,
            },
          }),
        ).unwrap();
        toast.success(tSuccess("inventory.adjusted"));
        setAdjustDialog({ open: false, item: null });

        // Refetch inventory to get updated quantities
        const fetchParams: Record<string, unknown> = { page, limit };
        if (sortBy) {
          fetchParams.sortBy = sortBy;
          fetchParams.sortOrder = sortOrder;
        }
        dispatch(
          fetchInventory({
            storeId: currentStoreId,
            params: fetchParams as PaginationParams,
          }),
        );
      } catch (err: unknown) {
        const message =
          typeof err === "string" ? err : tInv("adjustDescription");
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      dispatch,
      currentStoreId,
      adjustDialog.item,
      page,
      limit,
      sortBy,
      sortOrder,
    ],
  );

  // Handle retry on error
  const handleRetry = useCallback(() => {
    if (!currentStoreId) return;
    dispatch(
      fetchInventory({ storeId: currentStoreId, params: { page, limit } }),
    );
  }, [dispatch, currentStoreId, page, limit]);

  // Table columns definition
  const columns: ColumnDef<InventoryItem, unknown>[] = useMemo(
    () => [
      {
        id: "product_name",
        accessorKey: "product_name",
        header: tInv("headerProduct"),
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.product_name}</div>
            <div className="text-sm text-muted-foreground">
              {row.original.variant_title}
            </div>
          </div>
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
        header: tInv("headerAvailable"),
        enableSorting: true,
        cell: ({ row }) => {
          const { available_quantity, low_stock_threshold } = row.original;
          const isLow = available_quantity <= low_stock_threshold;
          return (
            <div className="flex items-center gap-2">
              <span className={isLow ? "text-destructive font-medium" : ""}>
                {available_quantity}
              </span>
              {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
            </div>
          );
        },
      },
      {
        id: "total_quantity",
        accessorKey: "total_quantity",
        header: tInv("headerTotal"),
        enableSorting: true,
        cell: ({ row }) => row.original.total_quantity,
      },
      {
        id: "reserved_quantity",
        accessorKey: "reserved_quantity",
        header: tInv("headerReserved"),
        enableSorting: true,
        cell: ({ row }) => row.original.reserved_quantity,
      },
      {
        id: "low_stock_threshold",
        accessorKey: "low_stock_threshold",
        header: tInv("headerThreshold"),
        enableSorting: true,
        cell: ({ row }) => row.original.low_stock_threshold,
      },
      {
        id: "actions",
        header: tInv("headerActions"),
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustDialog({ open: true, item })}
            >
              <PackagePlus className="me-2 h-4 w-4" />
              تعديل
            </Button>
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
          <h2 className="text-2xl font-bold tracking-tight">المخزون</h2>
          <p className="text-muted-foreground">
            إدارة مستويات المخزون وتعديل الكميات
          </p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={inventoryItems}
        meta={meta}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSortChange={handleSortChange}
        onRetry={handleRetry}
        emptyMessage="لا توجد عناصر مخزون"
        emptyIcon={<Warehouse className="h-12 w-12" />}
      />

      {/* Adjustment Dialog */}
      <AdjustmentDialog
        open={adjustDialog.open}
        onOpenChange={(open) => {
          if (!open) setAdjustDialog({ open: false, item: null });
        }}
        item={adjustDialog.item}
        onSubmit={handleAdjustSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
