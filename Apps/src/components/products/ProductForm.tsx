"use client";

/**
 * ProductForm Component (Tabbed)
 * Enhanced form for creating and editing products with tabs:
 * - Basic Info (name, slug, description, base_price, status)
 * - Options & Variants (up to 3 options, 50 values each)
 * - Images (drag & drop, up to 20, max 5MB each)
 * - Categories (multi-select from tree)
 * - SEO (meta_title max 70, meta_description max 160)
 *
 * Data is preserved when switching between tabs (no re-render/loss).
 * "Save as Draft" button sets status=DRAFT regardless of selected publish status.
 *
 * Requirements: 9.4, 9.5, 6.6
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useAutoSaveDraft } from "@/hooks/useAutoSaveDraft";

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
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .replace(/[^\w-]/g, "")
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
  const t = useTranslations("productForm");
  const tCommon = useTranslations("common");
  const isEditMode = !!product;

  // Active tab state
  const [activeTab, setActiveTab] = useState("basic");

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

  // Save as draft loading
  const [draftSaving, setDraftSaving] = useState(false);

  // Form setup with Zod validation
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { isSubmitting, errors, isDirty },
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
      meta_title: "",
      meta_description: "",
    },
  });

  // Unsaved changes warning
  useUnsavedChanges({ isDirty });

  // Auto-save draft
  const formId = isEditMode ? `product-edit-${product?.id}` : "product-create";
  const { hasDraft, draftData, restoreDraft, clearDraft } = useAutoSaveDraft(
    formId,
    watch,
  );

  // Show draft restoration prompt
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  useEffect(() => {
    if (hasDraft && !isEditMode) {
      setShowDraftPrompt(true);
    }
  }, [hasDraft, isEditMode]);

  const handleRestoreDraft = useCallback(() => {
    const data = restoreDraft();
    if (data) {
      reset(data);
    }
    setShowDraftPrompt(false);
  }, [restoreDraft, reset]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setShowDraftPrompt(false);
  }, [clearDraft]);

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

      if (
        !product ||
        !PRODUCT_STATUS_TRANSITIONS[product.status]?.includes(newStatus)
      ) {
        toast.error(t("invalidStatusTransition"));
        return;
      }

      setStatusLoading(true);
      try {
        await onStatusChange(newStatus);
        toast.success(t("statusChanged"));
      } catch {
        toast.error(t("statusChangeFailed"));
      } finally {
        setStatusLoading(false);
      }
    },
    [onStatusChange, product, t],
  );

  // Form submission handler
  const onFormSubmit = async (data: ProductFormData) => {
    setSummaryErrors([]);

    try {
      await onSubmit({ ...data, category_ids: selectedCategories });
      clearDraft();
    } catch (err: unknown) {
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
          "meta_title",
          "meta_description",
        ];
        const unmapped = mapServerErrorsToForm(apiError, setError, fieldNames);
        setSummaryErrors(unmapped);
      } else {
        setSummaryErrors([t("unexpectedError")]);
      }
    }
  };

  // Save as Draft handler
  const handleSaveAsDraft = useCallback(async () => {
    const currentData = watch();
    setSummaryErrors([]);
    setDraftSaving(true);

    try {
      await onSubmit({
        ...currentData,
        status: "DRAFT",
        category_ids: selectedCategories,
      });
      clearDraft();
      toast.success(t("savedAsDraft"));
    } catch (err: unknown) {
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
          "meta_title",
          "meta_description",
        ];
        const unmapped = mapServerErrorsToForm(apiError, setError, fieldNames);
        setSummaryErrors(unmapped);
      } else {
        setSummaryErrors([t("unexpectedError")]);
      }
    } finally {
      setDraftSaving(false);
    }
  }, [watch, onSubmit, selectedCategories, clearDraft, setError, t]);

  // SEO character counters
  const metaTitleValue = watch("meta_title") || "";
  const metaDescriptionValue = watch("meta_description") || "";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Draft restoration prompt */}
      {showDraftPrompt && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm">{t("draftFound")}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDiscardDraft}>
                {t("startFresh")}
              </Button>
              <Button size="sm" onClick={handleRestoreDraft}>
                {t("restoreDraft")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary errors */}
      <FormSummaryError errors={summaryErrors} />

      {/* Status section (edit mode only) */}
      {isEditMode && product && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("productStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("currentStatus")}:
                </span>
                <Badge variant="outline">
                  {PRODUCT_STATUS_LABELS[product.status].ar}
                </Badge>
              </div>

              {availableTransitions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t("changeTo")}:
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
                  {t("noTransitions")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Form */}
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
            <TabsTrigger value="variants">{t("tabs.variants")}</TabsTrigger>
            <TabsTrigger value="images">{t("tabs.images")}</TabsTrigger>
            <TabsTrigger value="categories">{t("tabs.categories")}</TabsTrigger>
            <TabsTrigger value="seo">{t("tabs.seo")}</TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic Information */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("basicInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={control}
                  name="name"
                  label={t("fields.name")}
                  placeholder={t("placeholders.name")}
                  required
                />

                <div className="space-y-2">
                  <FormField
                    control={control}
                    name="slug"
                    label={t("fields.slug")}
                    placeholder="product-slug"
                    description={
                      autoSlug ? t("slugAutoGenerated") : t("slugManual")
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
                      {t("autoGenerate")}
                    </Label>
                  </div>
                </div>

                <FormField
                  control={control}
                  name="short_description"
                  label={t("fields.shortDescription")}
                  type="textarea"
                  placeholder={t("placeholders.shortDescription")}
                />

                <FormField
                  control={control}
                  name="description"
                  label={t("fields.description")}
                  type="textarea"
                  placeholder={t("placeholders.description")}
                />
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("pricing")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={control}
                    name="base_price"
                    label={t("fields.basePrice")}
                    placeholder="0.00"
                    required
                  />

                  <FormField
                    control={control}
                    name="compare_at_price"
                    label={t("fields.compareAtPrice")}
                    placeholder="0.00"
                    description={t("compareAtPriceDesc")}
                  />

                  <FormField
                    control={control}
                    name="cost_price"
                    label={t("fields.costPrice")}
                    placeholder="0.00"
                    description={t("costPriceDesc")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("inventory")}</CardTitle>
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
                      <Label htmlFor="track_inventory">
                        {t("fields.trackInventory")}
                      </Label>
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            {/* Status (create mode only) */}
            {!isEditMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("status")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={control}
                    name="status"
                    label={t("fields.status")}
                    type="select"
                    options={[
                      { value: "DRAFT", label: PRODUCT_STATUS_LABELS.DRAFT.ar },
                      {
                        value: "ACTIVE",
                        label: PRODUCT_STATUS_LABELS.ACTIVE.ar,
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: Options & Variants */}
          <TabsContent value="variants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("optionsAndVariants")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("variantsEditNote")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          ROUTES.STORE_ADMIN.PRODUCT_EDIT(product!.id) +
                            "/../variants",
                        )
                      }
                    >
                      {t("manageVariants")}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      {t("variantsCreateNote")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Images */}
          <TabsContent value="images" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("images")}</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("imagesEditNote")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          ROUTES.STORE_ADMIN.PRODUCT_EDIT(product!.id) +
                            "/../media",
                        )
                      }
                    >
                      {t("manageImages")}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      {t("imagesCreateNote")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Categories */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("categoriesTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flatCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("noCategories")}
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border p-3">
                    {flatCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-2"
                        style={{
                          paddingInlineStart: `${cat.level * 1.5}rem`,
                        }}
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
                        <Badge
                          key={catId}
                          variant="secondary"
                          className="text-xs"
                        >
                          {cat.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: SEO */}
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("seo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <FormField
                    control={control}
                    name="meta_title"
                    label={t("fields.metaTitle")}
                    placeholder={t("placeholders.metaTitle")}
                    description={t("metaTitleDesc", {
                      count: metaTitleValue.length,
                      max: 70,
                    })}
                  />
                  <div className="text-xs text-muted-foreground text-end">
                    {metaTitleValue.length}/70
                  </div>
                </div>

                <div className="space-y-2">
                  <Controller
                    control={control}
                    name="meta_description"
                    render={({ field, fieldState }) => (
                      <div className="space-y-2">
                        <Label
                          htmlFor="meta_description"
                          className={
                            fieldState.error ? "text-destructive" : undefined
                          }
                        >
                          {t("fields.metaDescription")}
                        </Label>
                        <Textarea
                          id="meta_description"
                          placeholder={t("placeholders.metaDescription")}
                          aria-describedby={
                            fieldState.error
                              ? "meta_description-error"
                              : undefined
                          }
                          aria-invalid={!!fieldState.error || undefined}
                          className={
                            fieldState.error ? "border-destructive" : undefined
                          }
                          ref={field.ref}
                          name={field.name}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          value={field.value ?? ""}
                          rows={3}
                        />
                        <div className="flex justify-between">
                          <p className="text-xs text-muted-foreground">
                            {t("metaDescriptionDesc")}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {metaDescriptionValue.length}/160
                          </span>
                        </div>
                        {fieldState.error?.message && (
                          <p
                            id="meta_description-error"
                            className="text-sm text-destructive"
                            role="alert"
                          >
                            {fieldState.error.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>

                {/* SEO Preview */}
                <div className="rounded-md border p-4 space-y-1">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("seoPreview")}
                  </p>
                  <p className="text-blue-600 text-base font-medium truncate">
                    {metaTitleValue || watch("name") || t("seoPreviewTitle")}
                  </p>
                  <p className="text-green-700 text-xs">
                    example.com/products/{watch("slug") || "product-slug"}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {metaDescriptionValue ||
                      watch("short_description") ||
                      t("seoPreviewDescription")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(ROUTES.STORE_ADMIN.PRODUCTS)}
          >
            {tCommon("cancel")}
          </Button>

          <div className="flex items-center gap-3">
            {/* Save as Draft button */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveAsDraft}
              disabled={isSubmitting || draftSaving}
            >
              {draftSaving ? t("saving") : t("saveAsDraft")}
            </Button>

            {/* Main submit button */}
            <SubmitButton isSubmitting={isSubmitting}>
              {isEditMode ? t("saveChanges") : t("createProduct")}
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
