"use client";

/**
 * Coupons Management Page
 * Displays a paginated table of coupons with create/edit dialog and delete confirmation.
 *
 * Requirements: 11.1, 11.2, 11.5
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { Ticket, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "@/lib/store/slices/coupons.thunks";
import { usePagination } from "@/hooks/usePagination";
import { useStore } from "@/hooks/useStore";
import { formatDate } from "@/lib/utils/formatDate";
import {
  couponSchema,
  type CouponFormData,
} from "@/lib/validators/coupon.schema";
import type { Coupon, PaginationParams } from "@/types";

// ─── Coupon Form Dialog ──────────────────────────────────────────────────────

interface CouponFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: Coupon | null;
  onSubmit: (data: CouponFormData) => Promise<void>;
  isSubmitting: boolean;
}

function CouponFormDialog({
  open,
  onOpenChange,
  coupon,
  onSubmit,
  isSubmitting,
}: CouponFormDialogProps) {
  const isEdit = !!coupon;

  const { control, handleSubmit, reset, watch } = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      type: "PERCENTAGE",
      value: 0,
      minimum_order_amount: null,
      maximum_discount_amount: null,
      usage_limit: null,
      usage_limit_per_customer: null,
      starts_at: null,
      ends_at: null,
      is_active: true,
    },
  });

  const couponType = watch("type");

  // Reset form when dialog opens/closes or coupon changes
  useEffect(() => {
    if (open) {
      if (coupon) {
        reset({
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minimum_order_amount: coupon.minimum_order_amount,
          maximum_discount_amount: coupon.maximum_discount_amount,
          usage_limit: coupon.usage_limit,
          usage_limit_per_customer: coupon.usage_limit_per_customer,
          starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 16) : null,
          ends_at: coupon.ends_at ? coupon.ends_at.slice(0, 16) : null,
          is_active: coupon.is_active,
        });
      } else {
        reset({
          code: "",
          type: "PERCENTAGE",
          value: 0,
          minimum_order_amount: null,
          maximum_discount_amount: null,
          usage_limit: null,
          usage_limit_per_customer: null,
          starts_at: null,
          ends_at: null,
          is_active: true,
        });
      }
    }
  }, [open, coupon, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "تعديل الكوبون" : "إنشاء كوبون جديد"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "قم بتعديل بيانات الكوبون" : "أدخل بيانات الكوبون الجديد"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Code */}
          <FormField
            control={control}
            name="code"
            label="رمز الكوبون"
            placeholder="مثال: SUMMER2024"
            required
          />

          {/* Type */}
          <FormField
            control={control}
            name="type"
            label="نوع الخصم"
            type="select"
            options={[
              { value: "PERCENTAGE", label: "نسبة مئوية (%)" },
              { value: "FIXED", label: "مبلغ ثابت" },
            ]}
            required
          />

          {/* Value */}
          <FormField
            control={control}
            name="value"
            label={
              couponType === "PERCENTAGE" ? "قيمة الخصم (%)" : "قيمة الخصم"
            }
            type="number"
            placeholder={
              couponType === "PERCENTAGE" ? "1 - 100" : "أدخل المبلغ"
            }
            required
          />

          {/* Minimum order amount */}
          <FormField
            control={control}
            name="minimum_order_amount"
            label="الحد الأدنى للطلب"
            type="number"
            placeholder="اختياري"
          />

          {/* Maximum discount amount */}
          <FormField
            control={control}
            name="maximum_discount_amount"
            label="الحد الأقصى للخصم"
            type="number"
            placeholder="اختياري"
          />

          {/* Usage limit */}
          <FormField
            control={control}
            name="usage_limit"
            label="حد الاستخدام الكلي"
            type="number"
            placeholder="اختياري"
          />

          {/* Usage limit per customer */}
          <FormField
            control={control}
            name="usage_limit_per_customer"
            label="حد الاستخدام لكل عميل"
            type="number"
            placeholder="اختياري"
          />

          {/* Starts at */}
          <Controller
            control={control}
            name="starts_at"
            render={({ field, fieldState: { error } }) => (
              <div className="space-y-2">
                <Label htmlFor="starts_at">تاريخ البداية</Label>
                <input
                  id="starts_at"
                  type="datetime-local"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
                {error && (
                  <p className="text-xs text-destructive">{error.message}</p>
                )}
              </div>
            )}
          />

          {/* Ends at */}
          <Controller
            control={control}
            name="ends_at"
            render={({ field, fieldState: { error } }) => (
              <div className="space-y-2">
                <Label htmlFor="ends_at">تاريخ الانتهاء</Label>
                <input
                  id="ends_at"
                  type="datetime-local"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
                {error && (
                  <p className="text-xs text-destructive">{error.message}</p>
                )}
              </div>
            )}
          />

          {/* Is Active */}
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="is_active" className="cursor-pointer">
                  مفعّل
                </Label>
                <Switch
                  id="is_active"
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <SubmitButton isSubmitting={isSubmitting}>
              {isEdit ? "حفظ التعديلات" : "إنشاء الكوبون"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Coupons Page ────────────────────────────────────────────────────────────

export default function CouponsPage() {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();

  const {
    items: coupons,
    meta,
    loading,
    error,
  } = useAppSelector((state) => state.coupons);

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

  // Dialog state
  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    coupon: Coupon | null;
  }>({ open: false, coupon: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    coupon: Coupon | null;
  }>({ open: false, coupon: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch coupons when params change
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
      fetchCoupons({
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

  // Handle create/edit submit
  const handleFormSubmit = useCallback(
    async (data: CouponFormData) => {
      if (!currentStoreId) return;

      setIsSubmitting(true);
      try {
        // Clean up nullish values for the payload
        const payload = {
          ...data,
          minimum_order_amount: data.minimum_order_amount ?? undefined,
          maximum_discount_amount: data.maximum_discount_amount ?? undefined,
          usage_limit: data.usage_limit ?? undefined,
          usage_limit_per_customer: data.usage_limit_per_customer ?? undefined,
          starts_at: data.starts_at ?? undefined,
          ends_at: data.ends_at ?? undefined,
        };

        if (formDialog.coupon) {
          // Update
          await dispatch(
            updateCoupon({
              storeId: currentStoreId,
              couponId: formDialog.coupon.id,
              payload,
            }),
          ).unwrap();
          toast.success("تم تحديث الكوبون بنجاح");
        } else {
          // Create
          await dispatch(
            createCoupon({
              storeId: currentStoreId,
              payload,
            }),
          ).unwrap();
          toast.success("تم إنشاء الكوبون بنجاح");
        }

        setFormDialog({ open: false, coupon: null });
      } catch (err: unknown) {
        const message = typeof err === "string" ? err : "فشلت العملية";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [dispatch, currentStoreId, formDialog.coupon],
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!currentStoreId || !deleteDialog.coupon) return;

    setDeleteLoading(true);
    try {
      await dispatch(
        deleteCoupon({
          storeId: currentStoreId,
          couponId: deleteDialog.coupon.id,
        }),
      ).unwrap();
      toast.success("تم حذف الكوبون بنجاح");
    } catch (err: unknown) {
      const message = typeof err === "string" ? err : "فشل حذف الكوبون";
      // Handle delete prevention for coupons with usage records
      if (
        message.includes("usage") ||
        message.includes("used") ||
        message.includes("استخدام")
      ) {
        toast.error("لا يمكن حذف الكوبون لأنه تم استخدامه");
      } else {
        toast.error(message);
      }
    } finally {
      setDeleteLoading(false);
      setDeleteDialog({ open: false, coupon: null });
    }
  }, [dispatch, currentStoreId, deleteDialog.coupon]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    if (!currentStoreId) return;
    dispatch(
      fetchCoupons({ storeId: currentStoreId, params: { page, limit } }),
    );
  }, [dispatch, currentStoreId, page, limit]);

  // Table columns definition
  const columns: ColumnDef<Coupon, unknown>[] = useMemo(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: "رمز الكوبون",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.code}</span>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: "النوع",
        enableSorting: true,
        cell: ({ row }) => {
          const type = row.original.type;
          return (
            <StatusBadge
              label={type === "PERCENTAGE" ? "نسبة مئوية" : "مبلغ ثابت"}
              variant={type === "PERCENTAGE" ? "info" : "neutral"}
            />
          );
        },
      },
      {
        id: "value",
        accessorKey: "value",
        header: "القيمة",
        enableSorting: true,
        cell: ({ row }) => {
          const { type, value } = row.original;
          return type === "PERCENTAGE" ? `${value}%` : `${value} د.ل`;
        },
      },
      {
        id: "usage",
        header: "الاستخدام",
        enableSorting: false,
        cell: ({ row }) => {
          const { usage_count, usage_limit } = row.original;
          return usage_limit
            ? `${usage_count} / ${usage_limit}`
            : `${usage_count}`;
        },
      },
      {
        id: "starts_at",
        accessorKey: "starts_at",
        header: "تاريخ البداية",
        enableSorting: true,
        cell: ({ row }) => {
          const date = row.original.starts_at;
          return date ? formatDate(date) : "—";
        },
      },
      {
        id: "ends_at",
        accessorKey: "ends_at",
        header: "تاريخ الانتهاء",
        enableSorting: true,
        cell: ({ row }) => {
          const date = row.original.ends_at;
          return date ? formatDate(date) : "—";
        },
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: "الحالة",
        enableSorting: true,
        cell: ({ row }) => {
          const isActive = row.original.is_active;
          return (
            <StatusBadge
              label={isActive ? "مفعّل" : "معطّل"}
              variant={isActive ? "success" : "error"}
            />
          );
        },
      },
      {
        id: "actions",
        header: "الإجراءات",
        enableSorting: false,
        cell: ({ row }) => {
          const coupon = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">إجراءات</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Edit */}
                <DropdownMenuItem
                  onClick={() => setFormDialog({ open: true, coupon })}
                >
                  <Pencil className="me-2 h-4 w-4" />
                  تعديل
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Delete */}
                <DropdownMenuItem
                  onClick={() => setDeleteDialog({ open: true, coupon })}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  حذف
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
          <h2 className="text-2xl font-bold tracking-tight">الكوبونات</h2>
          <p className="text-muted-foreground">
            إدارة كوبونات الخصم والعروض الترويجية
          </p>
        </div>
        <Button onClick={() => setFormDialog({ open: true, coupon: null })}>
          <Plus className="me-2 h-4 w-4" />
          إنشاء كوبون
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={coupons}
        meta={meta}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSortChange={handleSortChange}
        onRetry={handleRetry}
        emptyMessage="لا توجد كوبونات"
        emptyIcon={<Ticket className="h-12 w-12" />}
      />

      {/* Create/Edit Dialog */}
      <CouponFormDialog
        open={formDialog.open}
        onOpenChange={(open) => {
          if (!open) setFormDialog({ open: false, coupon: null });
        }}
        coupon={formDialog.coupon}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, coupon: null });
        }}
        title="حذف الكوبون"
        description={`هل أنت متأكد من حذف الكوبون "${deleteDialog.coupon?.code}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        destructive
        loading={deleteLoading}
      />
    </div>
  );
}
