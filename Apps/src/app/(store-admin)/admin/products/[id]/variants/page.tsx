"use client";

/**
 * Product Variants Page
 * Manages product options, option values, and variant combinations.
 * - Create up to 3 options per product, each with up to 50 values
 * - Generate variants as cartesian product of all option values
 * - Display variants in a table with title, SKU, price, is_active, inventory level
 * - Edit variant: price, compare_at_price, SKU, barcode, is_active
 * - Set-default variant action
 *
 * Requirements: 7.3
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Trash2,
  X,
  Wand2,
  Star,
  Pencil,
  ArrowLeft,
  Package,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/tables/DataTable";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { useStore } from "@/hooks/useStore";
import { productService } from "@/lib/api/services/product.service";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { ProductOption, ProductVariant, OptionValue } from "@/types";

// ========== Constants ==========

const MAX_OPTIONS = 3;
const MAX_VALUES_PER_OPTION = 50;

// ========== Zod Schemas ==========

const variantEditSchema = z.object({
  price: z.string().optional(),
  compare_at_price: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  is_active: z.boolean(),
});

type VariantEditFormData = z.infer<typeof variantEditSchema>;

// ========== Component ==========

export default function ProductVariantsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentStoreId } = useStore();
  const productId = Number(params.id);

  // State
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // New option form state
  const [newOptionName, setNewOptionName] = useState("");
  const [addingOption, setAddingOption] = useState(false);

  // New value input state per option
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>(
    {},
  );

  // Variant edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    variant: ProductVariant | null;
  }>({ open: false, variant: null });

  // ========== Data Fetching ==========

  const fetchData = useCallback(async () => {
    if (!currentStoreId || !productId) return;

    setLoading(true);
    try {
      const [optionsRes, variantsRes] = await Promise.all([
        productService.getOptions(currentStoreId, productId),
        productService.getVariants(currentStoreId, productId),
      ]);
      setOptions(optionsRes.data);
      setVariants(variantsRes.data);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "فشل تحميل البيانات";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ========== Option Management ==========

  const handleCreateOption = useCallback(async () => {
    if (!currentStoreId || !newOptionName.trim()) return;
    if (options.length >= MAX_OPTIONS) {
      toast.error(`لا يمكن إضافة أكثر من ${MAX_OPTIONS} خيارات`);
      return;
    }

    setAddingOption(true);
    try {
      const res = await productService.createOption(currentStoreId, productId, {
        name: newOptionName.trim(),
        position: options.length + 1,
      });
      setOptions((prev) => [...prev, res.data]);
      setNewOptionName("");
      toast.success("تم إضافة الخيار بنجاح");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "فشل إضافة الخيار";
      toast.error(message);
    } finally {
      setAddingOption(false);
    }
  }, [currentStoreId, productId, newOptionName, options.length]);

  const handleDeleteOption = useCallback(
    async (optionId: number) => {
      if (!currentStoreId) return;

      setActionLoading(true);
      try {
        await productService.deleteOption(currentStoreId, productId, optionId);
        setOptions((prev) => prev.filter((o) => o.id !== optionId));
        toast.success("تم حذف الخيار بنجاح");
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "فشل حذف الخيار";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [currentStoreId, productId],
  );

  // ========== Option Value Management ==========

  const handleAddValue = useCallback(
    async (optionId: number) => {
      if (!currentStoreId) return;

      const value = newValueInputs[optionId]?.trim();
      if (!value) return;

      const option = options.find((o) => o.id === optionId);
      if (option && option.values.length >= MAX_VALUES_PER_OPTION) {
        toast.error(
          `لا يمكن إضافة أكثر من ${MAX_VALUES_PER_OPTION} قيمة لكل خيار`,
        );
        return;
      }

      setActionLoading(true);
      try {
        const res = await productService.addOptionValue(
          currentStoreId,
          productId,
          optionId,
          {
            value,
            position: option ? option.values.length + 1 : 1,
          },
        );
        // Update the option in state with the returned option (which includes updated values)
        setOptions((prev) =>
          prev.map((o) => (o.id === optionId ? res.data : o)),
        );
        setNewValueInputs((prev) => ({ ...prev, [optionId]: "" }));
        toast.success("تم إضافة القيمة بنجاح");
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "فشل إضافة القيمة";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [currentStoreId, productId, newValueInputs, options],
  );

  const handleDeleteValue = useCallback(
    async (optionId: number, valueId: number) => {
      if (!currentStoreId) return;

      setActionLoading(true);
      try {
        await productService.deleteOptionValue(
          currentStoreId,
          productId,
          optionId,
          valueId,
        );
        setOptions((prev) =>
          prev.map((o) =>
            o.id === optionId
              ? { ...o, values: o.values.filter((v) => v.id !== valueId) }
              : o,
          ),
        );
        toast.success("تم حذف القيمة بنجاح");
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "فشل حذف القيمة";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [currentStoreId, productId],
  );

  // ========== Generate Variants ==========

  const handleGenerateVariants = useCallback(async () => {
    if (!currentStoreId) return;

    const hasValues = options.some((o) => o.values.length > 0);
    if (!hasValues) {
      toast.error("يجب إضافة قيم للخيارات أولاً");
      return;
    }

    setActionLoading(true);
    try {
      const res = await productService.generateVariants(
        currentStoreId,
        productId,
      );
      setVariants(res.data);
      toast.success("تم إنشاء المتغيرات بنجاح");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "فشل إنشاء المتغيرات";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }, [currentStoreId, productId, options]);

  // ========== Variant Actions ==========

  const handleSetDefault = useCallback(
    async (variantId: number) => {
      if (!currentStoreId) return;

      setActionLoading(true);
      try {
        await productService.setDefaultVariant(currentStoreId, variantId);
        setVariants((prev) =>
          prev.map((v) => ({
            ...v,
            is_default: v.id === variantId,
          })),
        );
        toast.success("تم تعيين المتغير الافتراضي");
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "فشل تعيين المتغير الافتراضي";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [currentStoreId],
  );

  const handleDeleteVariant = useCallback(
    async (variantId: number) => {
      if (!currentStoreId) return;

      setActionLoading(true);
      try {
        await productService.deleteVariant(currentStoreId, variantId);
        setVariants((prev) => prev.filter((v) => v.id !== variantId));
        toast.success("تم حذف المتغير بنجاح");
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "فشل حذف المتغير";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [currentStoreId],
  );

  // ========== Variant Edit Dialog ==========

  const variantEditForm = useForm<VariantEditFormData>({
    resolver: zodResolver(variantEditSchema),
    defaultValues: {
      price: "",
      compare_at_price: "",
      sku: "",
      barcode: "",
      is_active: true,
    },
  });

  const openEditDialog = useCallback(
    (variant: ProductVariant) => {
      variantEditForm.reset({
        price: variant.price || "",
        compare_at_price: variant.compare_at_price || "",
        sku: variant.sku || "",
        barcode: variant.barcode || "",
        is_active: variant.is_active,
      });
      setEditDialog({ open: true, variant });
    },
    [variantEditForm],
  );

  const handleVariantEditSubmit = useCallback(
    async (data: VariantEditFormData) => {
      if (!currentStoreId || !editDialog.variant) return;

      setActionLoading(true);
      try {
        const res = await productService.updateVariant(
          currentStoreId,
          editDialog.variant.id,
          {
            price: data.price || null,
            compare_at_price: data.compare_at_price || null,
            sku: data.sku || undefined,
            barcode: data.barcode || null,
            is_active: data.is_active,
          },
        );
        setVariants((prev) =>
          prev.map((v) => (v.id === res.data.id ? res.data : v)),
        );
        setEditDialog({ open: false, variant: null });
        toast.success("تم تحديث المتغير بنجاح");
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "فشل تحديث المتغير";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [currentStoreId, editDialog.variant],
  );

  // ========== Table Columns ==========

  const columns: ColumnDef<ProductVariant, unknown>[] = useMemo(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "العنوان",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span>{row.original.title}</span>
            {row.original.is_default && (
              <Badge variant="secondary" className="text-xs">
                <Star className="me-1 h-3 w-3" />
                افتراضي
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "sku",
        accessorKey: "sku",
        header: "SKU",
        enableSorting: false,
      },
      {
        id: "price",
        accessorKey: "price",
        header: "السعر",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.price ? formatCurrency(row.original.price) : "—",
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: "نشط",
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"}>
            {row.original.is_active ? "نشط" : "غير نشط"}
          </Badge>
        ),
      },
      {
        id: "inventory",
        header: "المخزون",
        enableSorting: false,
        cell: ({ row }) => {
          const inv = row.original.inventory;
          if (!inv) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className={
                inv.available_quantity <= inv.low_stock_threshold
                  ? "text-destructive font-medium"
                  : ""
              }
            >
              {inv.available_quantity}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "الإجراءات",
        enableSorting: false,
        cell: ({ row }) => {
          const variant = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEditDialog(variant)}
                title="تعديل"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {!variant.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleSetDefault(variant.id)}
                  disabled={actionLoading}
                  title="تعيين كافتراضي"
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleDeleteVariant(variant.id)}
                disabled={actionLoading || variant.is_default}
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [openEditDialog, handleSetDefault, handleDeleteVariant, actionLoading],
  );

  // ========== Render ==========

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              خيارات ومتغيرات المنتج
            </h2>
            <p className="text-muted-foreground">
              إدارة خيارات المنتج وإنشاء المتغيرات
            </p>
          </div>
        </div>

        <Button
          onClick={handleGenerateVariants}
          disabled={actionLoading || options.length === 0}
        >
          <Wand2 className="me-2 h-4 w-4" />
          إنشاء المتغيرات
        </Button>
      </div>

      {/* Options Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            الخيارات ({options.length}/{MAX_OPTIONS})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Options */}
          {options.map((option) => (
            <div key={option.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{option.name}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteOption(option.id)}
                  disabled={actionLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Values */}
              <div className="flex flex-wrap gap-2">
                {option.values.map((val) => (
                  <Badge
                    key={val.id}
                    variant="secondary"
                    className="gap-1 pe-1"
                  >
                    {val.value}
                    <button
                      type="button"
                      onClick={() => handleDeleteValue(option.id, val.id)}
                      className="ms-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      disabled={actionLoading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {/* Add Value Input */}
              {option.values.length < MAX_VALUES_PER_OPTION && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="أضف قيمة جديدة..."
                    value={newValueInputs[option.id] || ""}
                    onChange={(e) =>
                      setNewValueInputs((prev) => ({
                        ...prev,
                        [option.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddValue(option.id);
                      }
                    }}
                    className="max-w-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddValue(option.id)}
                    disabled={
                      actionLoading || !newValueInputs[option.id]?.trim()
                    }
                  >
                    <Plus className="me-1 h-3 w-3" />
                    إضافة
                  </Button>
                </div>
              )}

              {option.values.length >= MAX_VALUES_PER_OPTION && (
                <p className="text-xs text-muted-foreground">
                  تم الوصول للحد الأقصى ({MAX_VALUES_PER_OPTION} قيمة)
                </p>
              )}
            </div>
          ))}

          {/* Add New Option */}
          {options.length < MAX_OPTIONS && (
            <div className="flex items-center gap-2 pt-2">
              <Input
                placeholder="اسم الخيار (مثل: اللون، المقاس)"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateOption();
                  }
                }}
                className="max-w-xs"
              />
              <Button
                onClick={handleCreateOption}
                disabled={addingOption || !newOptionName.trim()}
                variant="outline"
              >
                <Plus className="me-1 h-4 w-4" />
                إضافة خيار
              </Button>
            </div>
          )}

          {options.length >= MAX_OPTIONS && (
            <p className="text-sm text-muted-foreground">
              تم الوصول للحد الأقصى من الخيارات ({MAX_OPTIONS})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Variants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            المتغيرات ({variants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {variants.length > 0 ? (
            <DataTable
              columns={columns}
              data={variants}
              meta={null}
              loading={false}
              emptyMessage="لا توجد متغيرات"
              emptyIcon={<Package className="h-12 w-12" />}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="mb-4 h-12 w-12" />
              <p className="text-sm">
                لا توجد متغيرات. أضف خيارات وقيم ثم اضغط &quot;إنشاء
                المتغيرات&quot;.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variant Edit Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => {
          if (!open) setEditDialog({ open: false, variant: null });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المتغير</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={variantEditForm.handleSubmit(handleVariantEditSubmit)}
            className="space-y-4"
          >
            <FormField
              control={variantEditForm.control}
              name="price"
              label="السعر"
              type="text"
              placeholder="0.00"
            />

            <FormField
              control={variantEditForm.control}
              name="compare_at_price"
              label="السعر قبل الخصم"
              type="text"
              placeholder="0.00"
            />

            <FormField
              control={variantEditForm.control}
              name="sku"
              label="SKU"
              type="text"
              placeholder="SKU-001"
            />

            <FormField
              control={variantEditForm.control}
              name="barcode"
              label="الباركود"
              type="text"
              placeholder="الباركود"
            />

            <div className="flex items-center justify-between">
              <Label htmlFor="variant-is-active">نشط</Label>
              <Switch
                id="variant-is-active"
                checked={variantEditForm.watch("is_active")}
                onCheckedChange={(checked) =>
                  variantEditForm.setValue("is_active", checked)
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialog({ open: false, variant: null })}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={actionLoading}>
                حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
