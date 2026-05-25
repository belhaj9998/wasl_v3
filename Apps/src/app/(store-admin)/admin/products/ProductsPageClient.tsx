"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  EyeOff,
  FileText,
  ImageIcon,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

type ProductFilterTab =
  | "all"
  | "published"
  | "hidden"
  | "draft"
  | "out_of_stock";

type AvailabilityFilter = "all" | "in_stock" | "out_of_stock";
type DiscountFilter = "all" | "discounted" | "not_discounted";
type NumericOperator = "none" | "equals" | "greater" | "less";

const PRODUCT_STATUS_OPTIONS = [
  PRODUCT_STATUS.PUBLISHED,
  PRODUCT_STATUS.DRAFT,
  PRODUCT_STATUS.HIDDEN,
] as ProductStatus[];

const STATUS_VARIANT_MAP: Record<ProductStatus, StatusVariant> = {
  DRAFT: "neutral",
  HIDDEN: "warning",
  PUBLISHED: "success",
  ARCHIVED: "error",
};

const STATUS_BY_TAB: Partial<Record<ProductFilterTab, ProductStatus>> = {
  published: PRODUCT_STATUS.PUBLISHED,
  hidden: PRODUCT_STATUS.HIDDEN,
  draft: PRODUCT_STATUS.DRAFT,
};

const PRODUCT_FILTER_TABS: Array<{
  value: ProductFilterTab;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "all", label: "الكل", icon: Package },
  { value: "published", label: "منشور", icon: CheckCircle2 },
  { value: "hidden", label: "مخفي", icon: EyeOff },
  { value: "draft", label: "مسودة", icon: FileText },
  { value: "out_of_stock", label: "نفذ المخزون", icon: AlertTriangle },
];

const PRODUCT_STATUS_DISPLAY_LABELS: Record<ProductStatus, string> = {
  DRAFT: "مسودة",
  HIDDEN: "مخفي",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

function getAvailableProductStatuses(currentStatus: ProductStatus) {
  return PRODUCT_STATUS_OPTIONS.filter((status) => status !== currentStatus);
}

function getPrimaryImage(product: Product) {
  return product.media?.[0]?.url || null;
}

function getCategoryLabel(product: Product) {
  const categories = product.categories || [];
  if (categories.length === 0) return "بدون تصنيف";
  if (categories.length === 1) return categories[0].name;
  return `${categories[0].name} +${categories.length - 1}`;
}

function getAvailableQuantity(product: Product) {
  return (product.variants || []).reduce((total, variant) => {
    if (!variant.is_active) return total;
    return total + (variant.inventory?.available_quantity ?? 0);
  }, 0);
}

function getInventoryIndicator(product: Product): {
  label: string;
  variant: StatusVariant;
} {
  if (!product.track_inventory) {
    return { label: "غير محدود", variant: "neutral" };
  }

  const quantity = getAvailableQuantity(product);
  if (quantity > 0) {
    return { label: `${quantity} متوفر`, variant: "success" };
  }

  return { label: "نفذ المخزون", variant: "error" };
}

function isOutOfStock(product: Product) {
  return product.track_inventory && getAvailableQuantity(product) <= 0;
}

function getProductPrice(product: Product) {
  return Number(product.base_price) || 0;
}

function hasDiscount(product: Product) {
  if (!product.compare_at_price) return false;
  return Number(product.compare_at_price) > getProductPrice(product);
}

function matchesNumericFilter(
  value: number,
  operator: NumericOperator,
  rawTarget: string,
) {
  if (operator === "none" || rawTarget.trim() === "") return true;

  const target = Number(rawTarget);
  if (Number.isNaN(target)) return true;

  if (operator === "equals") return value === target;
  if (operator === "greater") return value > target;
  return value < target;
}

export default function ProductsPageClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryIdFromUrl = searchParams.get("category_id");
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

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState<ProductFilterTab>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string>(() => {
    return categoryIdFromUrl || "all";
  });
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("all");
  const [discountFilter, setDiscountFilter] = useState<DiscountFilter>("all");
  const [priceOperator, setPriceOperator] = useState<NumericOperator>("none");
  const [priceValue, setPriceValue] = useState("");
  const [quantityOperator, setQuantityOperator] =
    useState<NumericOperator>("none");
  const [quantityValue, setQuantityValue] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [actionLoading, setActionLoading] = useState(false);

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

  const fetchParams = useMemo(() => {
    const params: Record<string, unknown> = {
      page,
      limit,
      sort_by: sortBy || "created_at",
      sort_order: sortOrder,
    };

    const tabStatus = STATUS_BY_TAB[activeTab];
    if (tabStatus) {
      params.status = tabStatus;
    }

    if (search.trim()) {
      params.search = search.trim();
    }

    if (categoryFilter !== "all") {
      params.category_id = categoryFilter;
    }

    return params;
  }, [activeTab, categoryFilter, limit, page, search, sortBy, sortOrder]);

  const displayedProducts = useMemo(() => {
    return products.filter((product) => {
      if (activeTab === "out_of_stock" && !isOutOfStock(product)) {
        return false;
      }

      if (availabilityFilter === "in_stock" && isOutOfStock(product)) {
        return false;
      }

      if (availabilityFilter === "out_of_stock" && !isOutOfStock(product)) {
        return false;
      }

      if (discountFilter === "discounted" && !hasDiscount(product)) {
        return false;
      }

      if (discountFilter === "not_discounted" && hasDiscount(product)) {
        return false;
      }

      if (
        !matchesNumericFilter(
          getProductPrice(product),
          priceOperator,
          priceValue,
        )
      ) {
        return false;
      }

      if (
        !matchesNumericFilter(
          getAvailableQuantity(product),
          quantityOperator,
          quantityValue,
        )
      ) {
        return false;
      }

      return true;
    });
  }, [
    activeTab,
    availabilityFilter,
    discountFilter,
    priceOperator,
    priceValue,
    products,
    quantityOperator,
    quantityValue,
  ]);

  const visibleProductIds = useMemo(
    () => displayedProducts.map((product) => product.id),
    [displayedProducts],
  );

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  );

  const allVisibleSelected =
    visibleProductIds.length > 0 &&
    visibleProductIds.every((id) => selectedProductIds.includes(id));

  useEffect(() => {
    if (currentStoreId) {
      dispatch(fetchCategories({ storeId: currentStoreId }));
    }
  }, [dispatch, currentStoreId]);

  useEffect(() => {
    if (!currentStoreId) return;

    dispatch(
      fetchProducts({
        storeId: currentStoreId,
        params: fetchParams as PaginationParams,
      }),
    );
  }, [dispatch, currentStoreId, fetchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setPage]);

  useEffect(() => {
    setSelectedProductIds([]);
  }, [
    activeTab,
    availabilityFilter,
    categoryFilter,
    discountFilter,
    limit,
    page,
    priceOperator,
    priceValue,
    quantityOperator,
    quantityValue,
    search,
    warehouseFilter,
  ]);

  const handleRetry = useCallback(() => {
    if (!currentStoreId) return;
    dispatch(
      fetchProducts({
        storeId: currentStoreId,
        params: fetchParams as PaginationParams,
      }),
    );
  }, [dispatch, currentStoreId, fetchParams]);

  const handleTabChange = (tab: ProductFilterTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    const [field, order] = value.split(":") as [string, "asc" | "desc"];
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const handleResetFilters = () => {
    setActiveTab("all");
    setWarehouseFilter("all");
    setCategoryFilter("all");
    setAvailabilityFilter("all");
    setDiscountFilter("all");
    setPriceOperator("none");
    setPriceValue("");
    setQuantityOperator("none");
    setQuantityValue("");
    setPage(1);
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const toggleVisibleSelection = () => {
    setSelectedProductIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleProductIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleProductIds]));
    });
  };

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

  const handleBulkStatusChange = useCallback(
    async (newStatus: ProductStatus) => {
      if (!currentStoreId || selectedProducts.length === 0) return;

      setActionLoading(true);
      try {
        await Promise.all(
          selectedProducts.map((product) =>
            dispatch(
              changeProductStatus({
                storeId: currentStoreId,
                productId: product.id,
                status: newStatus,
              }),
            ).unwrap(),
          ),
        );
        setSelectedProductIds([]);
        toast.success("تم تحديث المنتجات المحددة");
      } catch (err: unknown) {
        const message =
          typeof err === "string" ? err : "فشل تحديث المنتجات المحددة";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [currentStoreId, dispatch, selectedProducts],
  );

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
      setSelectedProductIds((current) =>
        current.filter((id) => id !== deleteDialog.product?.id),
      );
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

  const currentSortValue = `${sortBy || "created_at"}:${sortOrder}`;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">المنتجات</h2>
          <p className="text-muted-foreground">جميع منتجات متجرك هنا</p>
        </div>

        <PermissionGate permission="products.create">
          <Button
            className="w-full lg:w-auto"
            onClick={() => router.push(ROUTES.STORE_ADMIN.PRODUCT_CREATE)}
          >
            <Plus className="me-2 h-4 w-4" />
            إضافة منتج
          </Button>
        </PermissionGate>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRODUCT_FILTER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm transition ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث باسم المنتج أو الوصف أو SKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9"
          />
        </div>

        <Select value={currentSortValue} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">الأحدث أولاً</SelectItem>
            <SelectItem value="created_at:asc">الأقدم أولاً</SelectItem>
            <SelectItem value="updated_at:desc">آخر تحديث</SelectItem>
            <SelectItem value="name:asc">الاسم أ - ي</SelectItem>
            <SelectItem value="price:desc">السعر الأعلى</SelectItem>
            <SelectItem value="price:asc">السعر الأقل</SelectItem>
          </SelectContent>
        </Select>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full lg:w-auto">
              <SlidersHorizontal className="me-2 h-4 w-4" />
              معايير التصفية
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex w-full flex-col p-0 sm:max-w-md"
          >
            <SheetHeader className="border-b px-6 py-5">
              <SheetTitle className="text-2xl">معايير التصفية</SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
              <section className="space-y-4">
                <h3 className="text-lg font-semibold">اختيار المنتج</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    المخزن
                  </label>
                  <Select
                    value={warehouseFilter}
                    onValueChange={setWarehouseFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="المخزن" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="default">الرئيسي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    حالة نشر المنتج
                  </label>
                  <Select
                    value={activeTab === "out_of_stock" ? "all" : activeTab}
                    onValueChange={(value) => {
                      setActiveTab(value as ProductFilterTab);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="حالة نشر المنتج" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="published">منشور</SelectItem>
                      <SelectItem value="hidden">مخفي</SelectItem>
                      <SelectItem value="draft">مسودة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    تصنيفات المنتجات
                  </label>
                  <Select
                    value={categoryFilter}
                    onValueChange={(value) => {
                      setCategoryFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {flatCategories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    توفر المنتج
                  </label>
                  <Select
                    value={availabilityFilter}
                    onValueChange={(value) => {
                      setAvailabilityFilter(value as AvailabilityFilter);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="توفر المنتج" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="in_stock">متوفر</SelectItem>
                      <SelectItem value="out_of_stock">نفذ المخزون</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    حالة الخصم للمنتج
                  </label>
                  <Select
                    value={discountFilter}
                    onValueChange={(value) => {
                      setDiscountFilter(value as DiscountFilter);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="حالة الخصم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="discounted">عليه خصم</SelectItem>
                      <SelectItem value="not_discounted">بدون خصم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <section className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">سعر المنتج</h3>
                <div className="space-y-3">
                  {[
                    ["equals", "سعر المنتج يساوي"],
                    ["greater", "سعر المنتج أكثر من"],
                    ["less", "سعر المنتج أقل من"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center justify-between gap-3 text-sm"
                    >
                      <span>{label}</span>
                      <input
                        type="radio"
                        name="price-filter"
                        checked={priceOperator === value}
                        onChange={() => {
                          setPriceOperator(value as NumericOperator);
                          setPage(1);
                        }}
                        className="h-5 w-5 accent-primary"
                      />
                    </label>
                  ))}
                </div>
                <Input
                  type="number"
                  min="0"
                  placeholder="القيمة"
                  value={priceValue}
                  disabled={priceOperator === "none"}
                  onChange={(event) => {
                    setPriceValue(event.target.value);
                    setPage(1);
                  }}
                />
              </section>

              <section className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">
                  الكمية المتوفرة من المنتج
                </h3>
                <div className="space-y-3">
                  {[
                    ["equals", "الكمية تساوي"],
                    ["greater", "الكمية أكثر من"],
                    ["less", "الكمية أقل من"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center justify-between gap-3 text-sm"
                    >
                      <span>{label}</span>
                      <input
                        type="radio"
                        name="quantity-filter"
                        checked={quantityOperator === value}
                        onChange={() => {
                          setQuantityOperator(value as NumericOperator);
                          setPage(1);
                        }}
                        className="h-5 w-5 accent-primary"
                      />
                    </label>
                  ))}
                </div>
                <Input
                  type="number"
                  min="0"
                  placeholder="القيمة"
                  value={quantityValue}
                  disabled={quantityOperator === "none"}
                  onChange={(event) => {
                    setQuantityValue(event.target.value);
                    setPage(1);
                  }}
                />
              </section>
            </div>

            <SheetFooter className="gap-3 border-t px-6 py-5 sm:justify-start sm:space-x-0">
              <Button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="min-w-32"
              >
                تطبيق
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                className="min-w-32"
              >
                إعادة تعيين
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {selectedProductIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedProductIds.length}</Badge>
            <span className="text-sm font-medium">منتجات محددة</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading}
              onClick={() => handleBulkStatusChange(PRODUCT_STATUS.PUBLISHED)}
            >
              نشر
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading}
              onClick={() =>
                handleBulkStatusChange(PRODUCT_STATUS.HIDDEN)
              }
            >
              إخفاء
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedProductIds([])}
            >
              <X className="me-2 h-4 w-4" />
              إلغاء التحديد
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={toggleVisibleSelection}
            disabled={displayedProducts.length === 0}
          />
          تحديد الصفحة
        </label>

        <Select
          value={String(limit)}
          onValueChange={(value) => {
            setLimit(Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="العدد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">12 منتج</SelectItem>
            <SelectItem value="20">20 منتج</SelectItem>
            <SelectItem value="40">40 منتج</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="mb-3 text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="me-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-[340px] animate-pulse rounded-lg border bg-muted/30"
            />
          ))}
        </div>
      )}

      {!loading && !error && displayedProducts.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">لا توجد منتجات</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            جرّب تغيير الفلاتر أو إضافة منتج جديد.
          </p>
        </div>
      )}

      {!loading && !error && displayedProducts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {displayedProducts.map((product) => {
            const image = getPrimaryImage(product);
            const inventory = getInventoryIndicator(product);
            const availableStatuses = getAvailableProductStatuses(
              product.status,
            );
            const selected = selectedProductIds.includes(product.id);

            return (
              <article
                key={product.id}
                className={`group overflow-hidden rounded-lg border bg-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  selected ? "border-primary ring-1 ring-primary" : ""
                }`}
              >
                <div className="relative aspect-[4/3] bg-muted">
                  {image ? (
                    <Image
                      src={image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}

                  <div className="absolute start-3 top-3">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                      className="h-5 w-5 border-background bg-background/90"
                      aria-label={`تحديد ${product.name}`}
                    />
                  </div>

                  <div className="absolute end-3 top-3">
                    <StatusBadge
                      label={PRODUCT_STATUS_DISPLAY_LABELS[product.status]}
                      variant={STATUS_VARIANT_MAP[product.status]}
                      className="bg-background/90"
                    />
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(ROUTES.STORE_ADMIN.PRODUCT_EDIT(product.id))
                      }
                      className="line-clamp-2 text-start text-base font-semibold hover:text-primary"
                    >
                      {product.name}
                    </button>

                    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span className="truncate">
                        {getCategoryLabel(product)}
                      </span>
                      <span>{formatDate(product.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">السعر</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(product.base_price)}
                      </p>
                    </div>
                    <StatusBadge
                      label={inventory.label}
                      variant={inventory.variant}
                    />
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      {product.has_variants ? "له خيارات" : "منتج بسيط"}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">إجراءات</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <PermissionGate permission="products.update">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                ROUTES.STORE_ADMIN.PRODUCT_EDIT(product.id),
                              )
                            }
                          >
                            <Pencil className="me-2 h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                        </PermissionGate>

                        <PermissionGate permission="products.create">
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(product)}
                            disabled={actionLoading}
                          >
                            <Copy className="me-2 h-4 w-4" />
                            نسخ
                          </DropdownMenuItem>
                        </PermissionGate>

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
                                    onClick={() =>
                                      handleStatusChange(product, status)
                                    }
                                    disabled={actionLoading}
                                  >
                                    {PRODUCT_STATUS_DISPLAY_LABELS[status]}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          </PermissionGate>
                        )}

                        <DropdownMenuSeparator />

                        <PermissionGate permission="products.delete">
                          <DropdownMenuItem
                            onClick={() =>
                              setDeleteDialog({ open: true, product })
                            }
                            disabled={actionLoading}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="me-2 h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        </PermissionGate>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && meta && meta.totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages} - إجمالي {meta.total} منتج
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronRight className="me-2 h-4 w-4" />
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              التالي
              <ChevronLeft className="ms-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
