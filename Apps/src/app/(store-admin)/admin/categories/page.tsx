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
import {
  ChevronDown,
  ChevronLeft,
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label as UILabel } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

import type { Category } from "@/types";

// ─── Form Schema ─────────────────────────────────────────────────────────────
// Uses string for parent_id since select fields pass string values
const categoryFormSchema = z.object({
  name: categorySchema.shape.name,
  slug: categorySchema.shape.slug,
  description: z.string().nullish(),
  parent_id: z.string().nullish(),
  image_url: z.string().url().nullish().or(z.literal("")),
  is_active: z.boolean().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  parentCategories: Category[];
  onSubmit: (data: CategoryFormValues) => Promise<void>;
}

// ─── Category Form Dialog ────────────────────────────────────────────────────

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  parentCategories,
  onSubmit,
}: CategoryFormDialogProps) {
  const isEdit = !!category;
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const t = useTranslations("categories");
  const tCommon = useTranslations("common");

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
          parent_id: null,
          image_url: null,
          is_active: true,
        });
      }
      setServerErrors([]);
    }
  }, [open, category, reset]);

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

          <FormField
            control={control}
            name="image_url"
            label={t("imageUrlLabel")}
            placeholder="https://example.com/image.jpg"
            description={t("imageUrlDescription")}
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

// ─── Category Tree Node ──────────────────────────────────────────────────────

interface CategoryTreeNodeProps {
  category: Category;
  level: number;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
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
  index: number;
  parentId: number | null;
  dragOverId: number | null;
}

function CategoryTreeNode({
  category,
  level,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  index,
  parentId,
  dragOverId,
}: CategoryTreeNodeProps) {
  const t = useTranslations("categories");
  const tCommon = useTranslations("common");
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expanded.has(category.id);
  const isMaxDepth = level >= 3;
  const isDragOver = dragOverId === category.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
          "hover:bg-accent/50",
          isDragOver && "border-primary bg-primary/5",
        )}
        style={{ marginInlineStart: `${level * 24}px` }}
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
        {/* Drag handle */}
        <PermissionGate permission="categories.manage">
          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground shrink-0" />
        </PermissionGate>

        {/* Expand/collapse toggle */}
        {hasChildren && !isMaxDepth ? (
          <button
            onClick={() => onToggle(category.id)}
            className="shrink-0 rounded p-0.5 hover:bg-muted"
            aria-label={isExpanded ? t("collapse") : t("expand")}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Category info */}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm truncate block">
            {category.name}
          </span>
        </div>

        {/* Status badge */}
        {!category.is_active && (
          <Badge variant="secondary" className="text-xs shrink-0">
            غير نشط
          </Badge>
        )}

        {/* Product count */}
        {category.product_count !== undefined && (
          <span className="text-xs text-muted-foreground shrink-0">
            {category.product_count} منتج
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <PermissionGate permission="categories.manage">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(category)}
              aria-label={tCommon("edit")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </PermissionGate>

          <PermissionGate permission="categories.manage">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(category)}
              aria-label={tCommon("delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && !isMaxDepth && (
        <div className="mt-1 space-y-1">
          {category.children!.map((child, childIndex) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              index={childIndex}
              parentId={category.id}
              dragOverId={dragOverId}
            />
          ))}
        </div>
      )}
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

  // Expand/collapse state
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Dialog states
  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    category: Category | null;
  }>({ open: false, category: null });

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
      dispatch(fetchCategories({ storeId: currentStoreId }));
    }
  }, [dispatch, currentStoreId]);

  // Expand all root categories by default
  useEffect(() => {
    if (categoryTree.length > 0 && expanded.size === 0) {
      const rootIds = new Set(categoryTree.map((c) => c.id));
      setExpanded(rootIds);
    }
  }, [categoryTree, expanded.size]);

  // Toggle expand/collapse
  const handleToggle = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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
      dispatch(fetchCategories({ storeId: currentStoreId }));
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
      dispatch(fetchCategories({ storeId: currentStoreId }));
    },
    [dispatch, currentStoreId, formDialog.category],
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
      dispatch(fetchCategories({ storeId: currentStoreId }));
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
          dispatch(fetchCategories({ storeId: currentStoreId }));
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
      dispatch(fetchCategories({ storeId: currentStoreId }));
    }
  }, [dispatch, currentStoreId]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الفئات</h2>
          <p className="text-muted-foreground">إدارة فئات المنتجات بشكل هرمي</p>
        </div>

        <PermissionGate permission="categories.manage">
          <Button onClick={() => setFormDialog({ open: true, category: null })}>
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
        <div
          className="space-y-1"
          onDragEnd={() => {
            setDragSource(null);
            setDragOverId(null);
          }}
        >
          {categoryTree.map((category, index) => (
            <CategoryTreeNode
              key={category.id}
              category={category}
              level={0}
              expanded={expanded}
              onToggle={handleToggle}
              onEdit={(cat) => setFormDialog({ open: true, category: cat })}
              onDelete={(cat) => setDeleteDialog({ open: true, category: cat })}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              index={index}
              parentId={null}
              dragOverId={dragOverId}
            />
          ))}
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
          if (!open) setFormDialog({ open: false, category: null });
        }}
        category={formDialog.category}
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
