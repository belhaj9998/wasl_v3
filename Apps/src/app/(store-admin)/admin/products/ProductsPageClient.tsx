"use client";

/**
 * Products List Page — Client Component
 * Displays a paginated, sortable, filterable table of store products.
 * Supports row actions: edit, duplicate, change status, delete (permission-gated).
 *
 * Requirements: 7.1, 15.1, 15.3, 22.1, 22.5
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Search,
  Package,
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchProducts,
  deleteProduct,
  changeProductStatus,
} from "@/lib/store/slices/products.thunks";
import { fetchCategories } from "@/lib/store/slices/categories.thunks";
import { usePagination } from "@/hooks/usePagination";
import { useStore } from "@/hooks/useStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { ROUTES } from "@/lib/constants/routes";
import { PRODUCT_STATUS, PRODUCT_STATUS_LABELS } from "@/lib/constants/enums";
import { productService } from "@/lib/api/services/product.service";
import type {
  Product,
  ProductStatus,
  PaginationParams,
  Category,
} from "@/types";
import type { StatusVariant } from "@/components/shared/StatusBadge";

// Valid product status transitions
const PRODUCT_STATUS_OPTIONS = Object.values(PRODUCT_STATUS) as ProductStatus[];

function getAvailableProductStatuses(currentStatus: ProductStatus) {
  return PRODUCT_STATUS_OPTIONS.filter((status) => status !== currentStatus);
}
const STATUS_VARIANT_MAP: Record<ProductStatus, StatusVariant> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "warning",
  PUBLISHED: "success",
  ARCHIVED: "error",
};

export default function ProductsPageClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentStoreId } = useStore();

  const {
    items: products,
    meta,
    loading,
    error,
  } = useAppSelector((state) => state.products);

  const { items: categories } = useAppSelector((state) => state.categories);

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

  // Search and filter state
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch categories for filter dropdown
  useEffect(() => {
    if (currentStoreId) {
      dispatch(fetchCategories({ storeId: currentStoreId }));
    }
  }, [dispatch, currentStoreId]);

  // Fetch products when params change
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

    if (search.trim()) {
      fetchParams.search = search.trim();
    }

    if (statusFilter !== "all") {
      fetchParams.status = statusFilter;
    }

    if (categoryFilter !== "all") {
      fetchParams.category_id = categoryFilter;
    }

    dispatch(
      fetchProducts({
        storeId: currentStoreId,
        params: fetchParams as PaginationParams,
      }),
    );
  }, [
    dispatch,
    currentStoreId,
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    statusFilter,
    categoryFilter,
  ]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setPage]);

  // Handle sort change from DataTable
  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      setSortBy(newSortBy || undefined);
      setSortOrder(newSortOrder);
    },
    [setSortBy, setSortOrder],
  );

  // Handle status change
  const handleStatusChange = useCallback(
    async (product: Product, newStatus: ProductStatus) => {
      if (!currentStoreId) return;

      setActionLoading(true);
      try {
        await dispatch(
          changeProductStatus({
            storeId: currentStoreId,
            productId: product.id,
            status: newStatus,
          }),
        ).unwrap();
        toast.success("تم تغيير حالة المنتج بنجاح");
      } catch (err: unknown) {
        const message = typeof err === "string" ? err : "فشل تغيير حالة المنتج";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [dispatch, currentStoreId],
  );

  // Handle duplicate
  const handleDuplicate = useCallback(
    async (product: Product) => {
      if (!currentStoreId) return;

      setActionLoading(true);
      try {
        const response = await productService.duplicate(
          currentStoreId,
          product.id,
        );
        toast.success("تم نسخ المنتج بنجاح");
        router.push(ROUTES.STORE_ADMIN.PRODUCT_EDIT(response.data.id));
      } catch (err: unknown) {
        const message = typeof err === "string" ? err : "فشل نسخ المنتج";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [currentStoreId, router],
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deleteDialog.product || !currentStoreId) return;

    setActionLoading(true);
    try {
      const result = await dispatch(
        deleteProduct({
          storeId: currentStoreId,
          productId: deleteDialog.product.id,
        }),
      ).unwrap();
      toast.success(
        result.action === "archived"
          ? "تم حذف المنتج من القائمة وحفظ سجله لأنه مرتبط بطلبات"
          : "تم حذف المنتج نهائيًا",
      );
    } catch (err: unknown) {
      const message = typeof err === "string" ? err : "فشل حذف المنتج";
      toast.error(message);
    } finally {
      setActionLoading(false);
      setDeleteDialog({ open: false, product: null });
    }
  }, [dispatch, deleteDialog.product, currentStoreId]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    if (!currentStoreId) return;
    dispatch(
      fetchProducts({ storeId: currentStoreId, params: { page, limit } }),
    );
  }, [dispatch, currentStoreId, page, limit]);

  // Determine inventory indicator for a product
  const getInventoryIndicator = (
    product: Product,
  ): { label: string; variant: StatusVariant } => {
    if (!product.track_inventory) {
      return { label: "—", variant: "neutral" };
    }

    const variants = product.variants || [];
    const hasStock = variants.some(
      (v) => v.is_active && v.inventory && v.inventory.available_quantity > 0,
    );

    return hasStock
      ? { label: "متوفر", variant: "success" }
      : { label: "نفذ", variant: "error" };
  };

  // Flatten categories for filter dropdown
  const flatCategories = useMemo(() => {
    const flat: Category[] = [];
    const flatten = (cats: Category[]) => {
      for (const cat of cats) {
        flat.push(cat);
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children);
        }
      }
    };
    flatten(categories);
    return flat;
  }, [categories]);

  // Table columns definition
  const columns: ColumnDef<Product, unknown>[] = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "اسم المنتج",
        enableSorting: true,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "الحالة",
        enableSorting: true,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <StatusBadge
              label={PRODUCT_STATUS_LABELS[status].ar}
              variant={STATUS_VARIANT_MAP[status]}
            />
          );
        },
      },
      {
        id: "base_price",
        accessorKey: "base_price",
        header: "السعر",
        enableSorting: true,
        cell: ({ row }) => formatCurrency(row.original.base_price),
      },
      {
        id: "inventory",
        header: "المخزون",
        enableSorting: false,
        cell: ({ row }) => {
          const { label, variant } = getInventoryIndicator(row.original);
          if (label === "—")
            return <span className="text-muted-foreground">—</span>;
          return <StatusBadge label={label} variant={variant} />;
        },
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: "تاريخ الإنشاء",
        enableSorting: true,
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        id: "actions",
        header: "الإجراءات",
        enableSorting: false,
        cell: ({ row }) => {
          const product = row.original;
          const availableStatuses = getAvailableProductStatuses(product.status);

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
                <PermissionGate permission="products.update">
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(ROUTES.STORE_ADMIN.PRODUCT_EDIT(product.id))
                    }
                  >
                    <Pencil className="me-2 h-4 w-4" />
                    تعديل
                  </DropdownMenuItem>
                </PermissionGate>

                {/* Duplicate */}
                <PermissionGate permission="products.create">
                  <DropdownMenuItem
                    onClick={() => handleDuplicate(product)}
                    disabled={actionLoading}
                  >
                    <Copy className="me-2 h-4 w-4" />
                    نسخ
                  </DropdownMenuItem>
                </PermissionGate>

                {/* Change Status */}
                {availableStatuses.length > 0 && (
                  <PermissionGate permission="products.update">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <RefreshCw className="me-2 h-4 w-4" />
                        تغيير الحالة
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {availableStatuses.map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => handleStatusChange(product, status)}
                            disabled={actionLoading}
                          >
                            {PRODUCT_STATUS_LABELS[status].ar}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </PermissionGate>
                )}

                <DropdownMenuSeparator />

                {/* Delete */}
                <PermissionGate permission="products.delete">
                  <DropdownMenuItem
                    onClick={() => setDeleteDialog({ open: true, product })}
                    disabled={actionLoading}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="me-2 h-4 w-4" />
                    حذف
                  </DropdownMenuItem>
                </PermissionGate>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router, handleStatusChange, handleDuplicate, actionLoading],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">المنتجات</h2>
          <p className="text-muted-foreground">إدارة منتجات متجرك</p>
        </div>

        {/* Add Product button — permission-gated */}
        <PermissionGate permission="products.create">
          <Button
            onClick={() => router.push(ROUTES.STORE_ADMIN.PRODUCT_CREATE)}
          >
            <Plus className="me-2 h-4 w-4" />
            إضافة منتج
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value={PRODUCT_STATUS.DRAFT}>
              {PRODUCT_STATUS_LABELS.DRAFT.ar}
            </SelectItem>
            <SelectItem value={PRODUCT_STATUS.PENDING_REVIEW}>
              {PRODUCT_STATUS_LABELS.PENDING_REVIEW.ar}
            </SelectItem>
            <SelectItem value={PRODUCT_STATUS.PUBLISHED}>
              {PRODUCT_STATUS_LABELS.PUBLISHED.ar}
            </SelectItem>
            <SelectItem value={PRODUCT_STATUS.ARCHIVED}>
              {PRODUCT_STATUS_LABELS.ARCHIVED.ar}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select
          value={categoryFilter}
          onValueChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="الفئة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفئات</SelectItem>
            {flatCategories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={products}
        meta={meta}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSortChange={handleSortChange}
        onRetry={handleRetry}
        emptyMessage="لا توجد منتجات"
        emptyIcon={<Package className="h-12 w-12" />}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, product: null });
        }}
        title="حذف المنتج"
        description={`هل أنت متأكد من حذف المنتج "${deleteDialog.product?.name}"؟ إذا كان مرتبطًا بطلبات قديمة سيُحفظ كسجل محذوف بدل الحذف النهائي.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        destructive
        loading={actionLoading}
      />
    </div>
  );
}
