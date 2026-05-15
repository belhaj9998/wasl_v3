"use client";

/**
 * ProductForm Component
 * Shared form for creating and editing products.
 * Implements Zod validation, server error mapping, slug auto-generation,
 * multi-select categories, and status transitions.
 *
 * Requirements: 7.2, 7.5, 7.6, 21.1, 21.2
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormField } from "@/components/forms/FormField";
import { FormSummaryError } from "@/components/forms/FormSummaryError";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { mapServerErrorsToForm } from "@/components/forms/mapServerErrors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FormError } from "@/components/forms/FormError";

import {
  productSchema,
  type ProductFormData,
} from "@/lib/validators/product.schema";
import { PRODUCT_STATUS_LABELS } from "@/lib/constants/enums";
import { ROUTES } from "@/lib/constants/routes";
import type { Product, Category, ProductStatus } from "@/types";
import type { ApiError } from "@/types/api.types";

// Valid product status transitions
const PRODUCT_STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export interface ProductFormProps {
  /** Existing product for edit mode (null for create) */
  product?: Product | null;
  /** Available categories for multi-select */
  categories: Category[];
  /** Whether the form is in loading state */
  loading?: boolean;
  /** Submit handler — receives validated form data + selected category IDs */
  onSubmit: (
    data: ProductFormData & { category_ids: number[] },
  ) => Promise<void>;
  /** Status change handler (edit mode only) */
  onStatusChange?: (newStatus: ProductStatus) => Promise<void>;
}

/**
 * Generates a URL-friendly slug from a product name.
 * Handles Arabic text by transliterating common patterns and falling back to
 * a simplified version.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "") // Keep alphanumeric, Arabic, hyphens
    .replace(/[^\w-]/g, "") // Remove non-ASCII (Arabic) for slug
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  product,
  categories,
  loading = false,
  onSubmit,
  onStatusChange,
}: ProductFormProps) {
  const router = useRouter();
  const isEditMode = !!product;

  // Selected categories state
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    product?.categories?.map((c) => c.id) || [],
  );

  // Server errors that don't map to fields
  const [summaryErrors, setSummaryErrors] = useState<string[]>([]);

  // Status change loading
  const [statusLoading, setStatusLoading] = useState(false);

  // Auto-generate slug flag
  const [autoSlug, setAutoSlug] = useState(!isEditMode);

  // Form setup with Zod validation
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      slug: product?.slug || "",
      description: product?.description || "",
      short_description: product?.short_description || "",
      base_price: product?.base_price || "",
      compare_at_price: product?.compare_at_price || "",
      cost_price: product?.cost_price || "",
      status: product?.status || "DRAFT",
      track_inventory: product?.track_inventory ?? true,
    },
  });

  // Watch name for auto-slug generation
  const nameValue = watch("name");

  useEffect(() => {
    if (autoSlug && nameValue) {
      const slug = generateSlug(nameValue);
      setValue("slug", slug);
    }
  }, [nameValue, autoSlug, setValue]);

  // Flatten categories for display (with indentation level)
  const flatCategories = useMemo(() => {
    const flat: Array<Category & { level: number }> = [];
    const flatten = (cats: Category[], level: number) => {
      for (const cat of cats) {
        flat.push({ ...cat, level });
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children, level + 1);
        }
      }
    };
    flatten(categories, 0);
    return flat;
  }, [categories]);

  // Toggle category selection
  const toggleCategory = useCallback((categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }, []);

  // Available status transitions for current product
  const availableTransitions = useMemo(() => {
    if (!product) return [];
    return PRODUCT_STATUS_TRANSITIONS[product.status] || [];
  }, [product]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (newStatus: ProductStatus) => {
      if (!onStatusChange) return;

      // Validate transition
      if (
        !product ||
        !PRODUCT_STATUS_TRANSITIONS[product.status]?.includes(newStatus)
      ) {
        toast.error(
          `لا يمكن تغيير الحالة من ${PRODUCT_STATUS_LABELS[product?.status || "DRAFT"].ar} إلى ${PRODUCT_STATUS_LABELS[newStatus].ar}`,
        );
        return;
      }

      setStatusLoading(true);
      try {
        await onStatusChange(newStatus);
        toast.success("تم تغيير حالة المنتج بنجاح");
      } catch {
        toast.error("فشل تغيير حالة المنتج");
      } finally {
        setStatusLoading(false);
      }
    },
    [onStatusChange, product],
  );

  // Form submission handler
  const onFormSubmit = async (data: ProductFormData) => {
    setSummaryErrors([]);

    try {
      await onSubmit({ ...data, category_ids: selectedCategories });
    } catch (err: unknown) {
      // Handle 422 server validation errors
      const apiError = err as ApiError;
      if (apiError?.errors || apiError?.message) {
        const fieldNames = [
          "name",
          "slug",
          "description",
          "short_description",
          "base_price",
          "compare_at_price",
          "cost_price",
          "status",
          "track_inventory",
        ];
        const unmapped = mapServerErrorsToForm(apiError, setError, fieldNames);
        setSummaryErrors(unmapped);
      } else {
        setSummaryErrors(["حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."]);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Summary errors */}
      <FormSummaryError errors={summaryErrors} />

      {/* Status section (edit mode only) */}
      {isEditMode && product && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">حالة المنتج</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  الحالة الحالية:
                </span>
                <Badge variant="outline">
                  {PRODUCT_STATUS_LABELS[product.status].ar}
                </Badge>
              </div>

              {availableTransitions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    تغيير إلى:
                  </span>
                  {availableTransitions.map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={statusLoading}
                      onClick={() => handleStatusChange(status)}
                    >
                      {PRODUCT_STATUS_LABELS[status].ar}
                    </Button>
                  ))}
                </div>
              )}

              {availableTransitions.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  لا توجد تحولات متاحة
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">المعلومات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="name"
            label="اسم المنتج"
            placeholder="أدخل اسم المنتج"
            required
          />

          <div className="space-y-2">
            <FormField
              control={control}
              name="slug"
              label="الرابط المختصر (Slug)"
              placeholder="product-slug"
              description={
                autoSlug
                  ? "يتم إنشاؤه تلقائياً من اسم المنتج"
                  : "أدخل الرابط المختصر يدوياً"
              }
              disabled={autoSlug}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="auto-slug"
                checked={autoSlug}
                onCheckedChange={setAutoSlug}
              />
              <Label
                htmlFor="auto-slug"
                className="text-sm text-muted-foreground"
              >
                إنشاء تلقائي
              </Label>
            </div>
          </div>

          <FormField
            control={control}
            name="short_description"
            label="وصف مختصر"
            type="textarea"
            placeholder="وصف مختصر للمنتج"
          />

          <FormField
            control={control}
            name="description"
            label="الوصف الكامل"
            type="textarea"
            placeholder="وصف تفصيلي للمنتج"
          />
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">التسعير</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={control}
              name="base_price"
              label="السعر الأساسي"
              placeholder="0.00"
              required
            />

            <FormField
              control={control}
              name="compare_at_price"
              label="السعر قبل الخصم"
              placeholder="0.00"
              description="يظهر كسعر مشطوب"
            />

            <FormField
              control={control}
              name="cost_price"
              label="سعر التكلفة"
              placeholder="0.00"
              description="للاستخدام الداخلي فقط"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الفئات</CardTitle>
        </CardHeader>
        <CardContent>
          {flatCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد فئات متاحة. قم بإنشاء فئات أولاً.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border p-3">
              {flatCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2"
                  style={{ paddingInlineStart: `${cat.level * 1.5}rem` }}
                >
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <Label
                    htmlFor={`cat-${cat.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {cat.name}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {selectedCategories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {selectedCategories.map((catId) => {
                const cat = flatCategories.find((c) => c.id === catId);
                return cat ? (
                  <Badge key={catId} variant="secondary" className="text-xs">
                    {cat.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="track_inventory"
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <Switch
                  id="track_inventory"
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="track_inventory">تتبع المخزون</Label>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Status (create mode only) */}
      {!isEditMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="status"
              label="حالة المنتج"
              type="select"
              options={[
                { value: "DRAFT", label: PRODUCT_STATUS_LABELS.DRAFT.ar },
                { value: "ACTIVE", label: PRODUCT_STATUS_LABELS.ACTIVE.ar },
              ]}
            />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(ROUTES.STORE_ADMIN.PRODUCTS)}
        >
          إلغاء
        </Button>

        <SubmitButton isSubmitting={isSubmitting}>
          {isEditMode ? "حفظ التغييرات" : "إنشاء المنتج"}
        </SubmitButton>
      </div>
    </form>
  );
}
