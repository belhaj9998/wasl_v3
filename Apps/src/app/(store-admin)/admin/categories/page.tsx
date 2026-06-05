"use client";

/**
 * Categories Page — Tree View
 * Displays categories in a hierarchical tree with expand/collapse (max 3 levels).
 * Supports create, edit, delete actions via dialog forms.
 * Implements drag-to-reorder with PATCH request (max 200 items).
 *
 * Requirements: 8.1, 8.4, 8.5, 8.6
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";

import { useRouter } from "next/navigation";
import {
  FolderTree,
  FolderPlus,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
  MoreVertical,
  Search,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "@/lib/store/slices/categories.thunks";
import { invalidateCategoriesListCache } from "@/lib/store/slices/categories.slice";
import { SingleImageUploader } from "@/components/shared/SingleImageUploader";
import { useStore } from "@/hooks/useStore";
import { buildCategoryTree } from "@/lib/utils/permissions";
import { categorySchema } from "@/lib/validators/category.schema";
import { mapServerErrorsToForm } from "@/components/forms/mapServerErrors";
import type { ApiError } from "@/types/api.types";

import { PermissionGate } from "@/components/shared/PermissionGate";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { FormSummaryError } from "@/components/forms/FormSummaryError";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label as UILabel } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/constants/routes";

import type { Category } from "@/types";

type CategoryStatusFilter = "all" | "published" | "hidden";

const CATEGORY_LIST_PARAMS = { limit: 100 };

interface CategoryRow {
  category: Category;
  level: number;
  index: number;
  parentId: number | null;
}

// ─── Form Schema ─────────────────────────────────────────────────────────────
// Uses string for parent_id since select fields pass string values
const categoryFormSchema = z.object({
  name: categorySchema.shape.name,
  slug: categorySchema.shape.slug,
  description: z.string().nullish(),
  parent_id: z.string().nullish(),
  image_url: z.string().nullish().or(z.literal("")),
  is_active: z.boolean().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  initialParentId?: number | null;
  parentCategories: Category[];
  onSubmit: (data: CategoryFormValues) => Promise<void>;
}

// ─── Category Form Dialog ────────────────────────────────────────────────────

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  initialParentId,
  parentCategories,
  onSubmit,
}: CategoryFormDialogProps) {
  const isEdit = !!category;
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const t = useTranslations("categories");
  const tCommon = useTranslations("common");
  const { currentStoreId } = useStore();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: null,
      parent_id: null,
      image_url: null,
      is_active: true,
    },
  });

  // Reset form when dialog opens/closes or category changes
  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name: category.name,
          slug: category.slug,
          description: category.description,
          parent_id: category.parent_id ? String(category.parent_id) : null,
          image_url: category.image_url,
          is_active: category.is_active,
        });
      } else {
        reset({
          name: "",
          slug: "",
          description: null,
          parent_id: initialParentId ? String(initialParentId) : null,
          image_url: null,
          is_active: true,
        });
      }
      setServerErrors([]);
    }
  }, [open, category, initialParentId, reset]);

  const handleFormSubmit = async (data: CategoryFormValues) => {
    setServerErrors([]);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (err: unknown) {
      // Handle server validation errors (ApiError shape)
      if (err && typeof err === "object" && "errors" in err) {
        const fieldNames = [
          "name",
          "slug",
          "description",
          "parent_id",
          "image_url",
          "is_active",
        ];
        const summaryErrors = mapServerErrorsToForm(
          err as ApiError,
          setError,
          fieldNames,
        );
        if (summaryErrors.length > 0) {
          setServerErrors(summaryErrors);
        }
      } else if (err && typeof err === "object" && "message" in err) {
        setServerErrors([(err as { message: string }).message]);
      } else {
        const message = typeof err === "string" ? err : t("createFailed");
        setServerErrors([message]);
      }
    }
  };

  // Build parent options (exclude current category and its children to prevent cycles)
  const parentOptions = useMemo(() => {
    const options = [{ value: "", label: t("noParent") }];

    const getDescendantIds = (cat: Category): number[] => {
      const ids = [cat.id];
      if (cat.children) {
        for (const child of cat.children) {
          ids.push(...getDescendantIds(child));
        }
      }
      return ids;
    };

    const excludeIds = category ? getDescendantIds(category) : [];

    const flatten = (cats: Category[], depth: number = 0) => {
      for (const cat of cats) {
        if (excludeIds.includes(cat.id)) continue;
        // Only allow up to 2 levels deep as parent (so child is max level 3)
        if (depth >= 2) continue;
        const prefix = "—".repeat(depth);
        options.push({
          value: String(cat.id),
          label: `${prefix} ${cat.name}`.trim(),
        });
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children, depth + 1);
        }
      }
    };

    flatten(parentCategories);
    return options;
  }, [parentCategories, category]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormSummaryError errors={serverErrors} />

          <FormField
            control={control}
            name="name"
            label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            required
          />

          <FormField
            control={control}
            name="slug"
            label={t("slugLabel")}
            placeholder={t("slugPlaceholder")}
            description={t("slugDescription")}
          />

          <FormField
            control={control}
            name="description"
            label={t("descriptionLabel")}
            type="textarea"
            placeholder={t("descriptionPlaceholder")}
          />

          <FormField
            control={control}
            name="parent_id"
            label={t("parentLabel")}
            type="select"
            options={parentOptions}
            placeholder={t("parentPlaceholder")}
          />

          <Controller
            control={control}
            name="image_url"
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <UILabel className="text-sm font-medium">صورة التصنيف</UILabel>
                <SingleImageUploader
                  value={field.value ?? null}
                  onChange={(url) => field.onChange(url)}
                  storeId={currentStoreId ?? 0}
                  alt="category image"
                  disabled={!currentStoreId}
                />
                {fieldState.error?.message && (
                  <p className="text-xs text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />

          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <UILabel htmlFor="is_active" className="cursor-pointer text-sm">
                  نشطة
                </UILabel>
                <Switch
                  id="is_active"
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

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
              {isEdit ? t("saveChanges") : tCommon("create")}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Category Row ────────────────────────────────────────────────────────────

interface CategoryTableRowProps extends CategoryRow {
  dragOverId: number | null;
  onAddChild: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onManageProducts: (category: Category) => void;
  onToggleActive: (category: Category, isActive: boolean) => void;
  onDragStart: (
    category: Category,
    index: number,
    parentId: number | null,
  ) => void;
  onDragOver: (
    e: React.DragEvent,
    category: Category,
    index: number,
    parentId: number | null,
  ) => void;
  onDrop: (e: React.DragEvent) => void;
}

function CategoryTableRow({
  category,
  level,
  index,
  parentId,
  dragOverId,
  onAddChild,
  onEdit,
  onDelete,
  onManageProducts,
  onToggleActive,
  onDragStart,
  onDragOver,
  onDrop,
}: CategoryTableRowProps) {
  const isDragOver = dragOverId === category.id;

  return (
    <div
      className={cn(
        "grid grid-cols-[64px_minmax(0,1fr)_120px_130px_48px] items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors",

        "hover:border-primary/35 hover:bg-accent/30",
        isDragOver && "border-primary bg-primary/5",
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(category, index, parentId);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(e, category, index, parentId);
      }}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-center">
        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
          {category.image_url ? (
            <Image
              src={category.image_url}
              alt={category.name}
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <FolderTree className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      <div
        className="flex min-w-0 items-center gap-2"
        style={{ paddingInlineStart: `${level * 24}px` }}
      >
        <PermissionGate permission="categories.manage">
          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
        </PermissionGate>

        <button
          type="button"
          onClick={() => onManageProducts(category)}
          className="min-w-0 truncate text-start text-sm font-semibold hover:text-primary"
          title={category.name}
        >
          {category.name}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onManageProducts(category)}
        className="text-center text-sm font-semibold tabular-nums text-foreground hover:text-primary"
        aria-label={`إدارة منتجات ${category.name}`}
      >
        {category.product_count ?? 0}
      </button>

      <PermissionGate permission="categories.manage">
        <div className="flex items-center justify-center">
          <Switch
            checked={category.is_active}
            onCheckedChange={(checked) => onToggleActive(category, checked)}
            aria-label={category.is_active ? "إخفاء التصنيف" : "إظهار التصنيف"}
          />
        </div>
      </PermissionGate>

      <PermissionGate permission="categories.manage">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="خيارات التصنيف"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem onClick={() => onAddChild(category)}>
              <FolderPlus className="me-2 h-4 w-4" />
              إضافة تصنيف فرعي
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(category)}>
              <Pencil className="me-2 h-4 w-4" />
              تعديل المعلومات
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageProducts(category)}>
              <ListChecks className="me-2 h-4 w-4" />
              إدارة منتجات الفئة
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(category)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="me-2 h-4 w-4" />
              حذف التصنيف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PermissionGate>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function CategoryTreeSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-7" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function CategoriesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("categories");
  const tSuccess = useTranslations("success");
  const tCommon = useTranslations("common");

  const {
    items: flatCategories,
    loading,
    error,
  } = useAppSelector((state) => state.categories);

  // Build tree from flat categories
  const categoryTree = useMemo(
    () => buildCategoryTree(flatCategories),
    [flatCategories],
  );

  const categoryRows = useMemo(() => {
    const rows: CategoryRow[] = [];

    const flatten = (
      categories: Category[],
      parentId: number | null = null,
      level: number = 0,
    ) => {
      categories.forEach((category, index) => {
        rows.push({ category, level, index, parentId });
        if (category.children && category.children.length > 0) {
          flatten(category.children, category.id, level + 1);
        }
      });
    };

    flatten(categoryTree);
    return rows;
  }, [categoryTree]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>("all");

  const visibleCategoryRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return categoryRows.filter(({ category }) => {
      const matchesSearch =
        !normalizedSearch ||
        category.name.toLowerCase().includes(normalizedSearch) ||
        category.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && category.is_active) ||
        (statusFilter === "hidden" && !category.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [categoryRows, search, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      all: categoryRows.length,
      published: categoryRows.filter(({ category }) => category.is_active)
        .length,
      hidden: categoryRows.filter(({ category }) => !category.is_active).length,
    }),
    [categoryRows],
  );

  // Dialog states
  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    category: Category | null;
    parentId: number | null;
  }>({ open: false, category: null, parentId: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    category: Category | null;
  }>({ open: false, category: null });

  const [actionLoading, setActionLoading] = useState(false);

  // Drag and drop state
  const [dragSource, setDragSource] = useState<{
    category: Category;
    index: number;
    parentId: number | null;
  } | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    if (currentStoreId) {
      dispatch(invalidateCategoriesListCache());
      dispatch(
        fetchCategories({
          storeId: currentStoreId,
          params: CATEGORY_LIST_PARAMS,
        }),
      );
    }
  }, [dispatch, currentStoreId]);

  // Create category
  const handleCreate = useCallback(
    async (data: CategoryFormValues) => {
      if (!currentStoreId) return;

      const payload = {
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || undefined,
        parent_id: data.parent_id ? Number(data.parent_id) : null,
        image_url: data.image_url || null,
        is_active: data.is_active,
      };

      await dispatch(
        createCategory({ storeId: currentStoreId, payload }),
      ).unwrap();
      toast.success(tSuccess("crud.created"));
      // Refetch to get updated tree
      dispatch(
        fetchCategories({
          storeId: currentStoreId,
          params: CATEGORY_LIST_PARAMS,
        }),
      );
    },
    [dispatch, currentStoreId],
  );

  // Update category
  const handleUpdate = useCallback(
    async (data: CategoryFormValues) => {
      if (!currentStoreId || !formDialog.category) return;

      const payload = {
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || undefined,
        parent_id: data.parent_id ? Number(data.parent_id) : null,
        image_url: data.image_url || null,
        is_active: data.is_active,
      };

      await dispatch(
        updateCategory({
          storeId: currentStoreId,
          categoryId: formDialog.category.id,
          payload,
        }),
      ).unwrap();
      toast.success(tSuccess("crud.updated"));
      // Refetch to get updated tree
      dispatch(
        fetchCategories({
          storeId: currentStoreId,
          params: CATEGORY_LIST_PARAMS,
        }),
      );
    },
    [dispatch, currentStoreId, formDialog.category],
  );

  const handleToggleActive = useCallback(
    async (category: Category, isActive: boolean) => {
      if (!currentStoreId) return;

      try {
        await dispatch(
          updateCategory({
            storeId: currentStoreId,
            categoryId: category.id,
            payload: { is_active: isActive },
          }),
        ).unwrap();
        toast.success(isActive ? "تم إظهار التصنيف" : "تم إخفاء التصنيف");
      } catch (err: unknown) {
        const message =
          typeof err === "string" ? err : "تعذر تحديث حالة التصنيف";
        toast.error(message);
      }
    },
    [dispatch, currentStoreId],
  );

  const handleManageProducts = useCallback(
    (category: Category) => {
      router.push(`${ROUTES.STORE_ADMIN.PRODUCTS}?category_id=${category.id}`);
    },
    [router],
  );

  // Delete category
  const handleDelete = useCallback(async () => {
    if (!currentStoreId || !deleteDialog.category) return;

    setActionLoading(true);
    try {
      await dispatch(
        deleteCategory({
          storeId: currentStoreId,
          categoryId: deleteDialog.category.id,
        }),
      ).unwrap();
      toast.success(tSuccess("crud.deleted"));
      // Refetch to get updated tree (children reassigned by backend)
      dispatch(
        fetchCategories({
          storeId: currentStoreId,
          params: CATEGORY_LIST_PARAMS,
        }),
      );
    } catch (err: unknown) {
      const message = typeof err === "string" ? err : t("deleteFailed");
      toast.error(message);
    } finally {
      setActionLoading(false);
      setDeleteDialog({ open: false, category: null });
    }
  }, [dispatch, currentStoreId, deleteDialog.category]);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (category: Category, index: number, parentId: number | null) => {
      setDragSource({ category, index, parentId });
    },
    [],
  );

  const handleDragOver = useCallback(
    (
      _e: React.DragEvent,
      category: Category,
      _index: number,
      _parentId: number | null,
    ) => {
      if (dragSource && dragSource.category.id !== category.id) {
        setDragOverId(category.id);
      }
    },
    [dragSource],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverId(null);

      if (!dragSource || !currentStoreId || dragOverId === null) {
        setDragSource(null);
        return;
      }

      // Find siblings at the same level as the drop target
      const findSiblings = (
        tree: Category[],
        targetId: number,
      ): { siblings: Category[]; parentId: number | null } | null => {
        for (let i = 0; i < tree.length; i++) {
          if (tree[i].id === targetId) {
            return { siblings: tree, parentId: null };
          }
          if (tree[i].children) {
            for (let j = 0; j < tree[i].children!.length; j++) {
              if (tree[i].children![j].id === targetId) {
                return { siblings: tree[i].children!, parentId: tree[i].id };
              }
              if (tree[i].children![j].children) {
                for (
                  let k = 0;
                  k < tree[i].children![j].children!.length;
                  k++
                ) {
                  if (tree[i].children![j].children![k].id === targetId) {
                    return {
                      siblings: tree[i].children![j].children!,
                      parentId: tree[i].children![j].id,
                    };
                  }
                }
              }
            }
          }
        }
        return null;
      };

      const result = findSiblings(categoryTree, dragOverId);
      if (!result) {
        setDragSource(null);
        return;
      }

      // Build reorder payload: insert dragged item at the target position
      const targetIndex = result.siblings.findIndex((c) => c.id === dragOverId);
      const newOrder = result.siblings
        .filter((c) => c.id !== dragSource.category.id)
        .map((c) => c.id);

      // Insert at target position
      newOrder.splice(targetIndex, 0, dragSource.category.id);

      // Build items array with new sort_order values
      const items = newOrder.map((id, idx) => ({
        id,
        sort_order: idx + 1,
      }));

      // Validate max 200 items (Requirement 8.4)
      if (items.length > 200) {
        toast.error(t("reorderMax"));
        setDragSource(null);
        return;
      }

      dispatch(
        reorderCategories({ storeId: currentStoreId, payload: { items } }),
      )
        .unwrap()
        .then(() => {
          toast.success(tSuccess("category.reordered"));
          dispatch(
            fetchCategories({
              storeId: currentStoreId,
              params: CATEGORY_LIST_PARAMS,
            }),
          );
        })
        .catch((err: unknown) => {
          // Handle invalid category IDs in reorder (Requirement 8.5)
          const message = typeof err === "string" ? err : t("reorderFailed");
          toast.error(message);
        });

      setDragSource(null);
    },
    [dragSource, dragOverId, currentStoreId, categoryTree, dispatch],
  );

  // Handle retry on error
  const handleRetry = useCallback(() => {
    if (currentStoreId) {
      dispatch(
        fetchCategories({
          storeId: currentStoreId,
          params: CATEGORY_LIST_PARAMS,
        }),
      );
    }
  }, [dispatch, currentStoreId]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الفئات</h2>
          <p className="text-muted-foreground">
            إدارة ظهور الفئات وربطها بمنتجات المتجر
          </p>
        </div>

        <PermissionGate permission="categories.manage">
          <Button
            onClick={() =>
              setFormDialog({ open: true, category: null, parentId: null })
            }
          >
            <Plus className="me-2 h-4 w-4" />
            إضافة فئة
          </Button>
        </PermissionGate>
      </div>

      {/* Content */}
      {loading && flatCategories.length === 0 ? (
        <CategoryTreeSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={handleRetry}>
            {tCommon("retry")}
          </Button>
        </div>
      ) : categoryTree.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="h-12 w-12" />}
          message={t("noCategories")}
        />
      ) : (
        <div className="rounded-xl border bg-background p-4 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row-reverse lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "الكل", statusCounts.all],
                  ["published", "منشور", statusCounts.published],
                  ["hidden", "مخفي", statusCounts.hidden],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    "inline-flex min-w-24 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    statusFilter === value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span>{label}</span>
                  <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs text-foreground">
                    {count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="بحث"
                className="h-11 rounded-full pe-10 text-end"
              />
            </div>
          </div>

          <div className="grid grid-cols-[64px_minmax(0,1fr)_120px_130px_48px] gap-3 rounded-lg bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
            <span className="text-center">الصورة</span>
            <span className="text-start">اسم التصنيف</span>
            <span className="text-center">عدد المنتجات</span>
            <span className="text-center">الحالة</span>
            <span />
          </div>

          <div
            className="mt-3 space-y-2"
            onDragEnd={() => {
              setDragSource(null);
              setDragOverId(null);
            }}
          >
            {visibleCategoryRows.length === 0 ? (
              <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                لا توجد فئات مطابقة للبحث أو الفلتر.
              </div>
            ) : (
              visibleCategoryRows.map(
                ({ category, level, index, parentId }) => (
                  <CategoryTableRow
                    key={category.id}
                    category={category}
                    level={level}
                    index={index}
                    parentId={parentId}
                    dragOverId={dragOverId}
                    onAddChild={(cat) =>
                      setFormDialog({
                        open: true,
                        category: null,
                        parentId: cat.id,
                      })
                    }
                    onEdit={(cat) =>
                      setFormDialog({
                        open: true,
                        category: cat,
                        parentId: null,
                      })
                    }
                    onDelete={(cat) =>
                      setDeleteDialog({ open: true, category: cat })
                    }
                    onManageProducts={handleManageProducts}
                    onToggleActive={handleToggleActive}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ),
              )
            )}
          </div>
        </div>
      )}

      {/* Loading indicator for background operations */}
      {loading && flatCategories.length > 0 && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ms-2 text-sm text-muted-foreground">
            {tCommon("loading")}
          </span>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CategoryFormDialog
        open={formDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setFormDialog({ open: false, category: null, parentId: null });
          }
        }}
        category={formDialog.category}
        initialParentId={formDialog.parentId}
        parentCategories={categoryTree}
        onSubmit={formDialog.category ? handleUpdate : handleCreate}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, category: null });
        }}
        title={t("deleteTitle")}
        description={t("deleteDescription", {
          name: deleteDialog.category?.name || "",
        })}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleDelete}
        destructive
        loading={actionLoading}
      />
    </div>
  );
}
