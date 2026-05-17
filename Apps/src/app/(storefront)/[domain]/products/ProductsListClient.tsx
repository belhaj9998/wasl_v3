"use client";

/**
 * Storefront Products Listing Page
 * Product grid with search, filters (price, category, availability), and pagination.
 * Filters sync with URL query parameters for shareable links.
 * Requirements: 8.2
 */

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import {
  useParams,
  useSearchParams,
  useRouter,
  usePathname,
} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Package, Search, Eye } from "lucide-react";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { ROUTES } from "@/lib/constants/routes";
import { EmptyState } from "@/components/shared";
import { ProductQuickView } from "@/components/storefront/ProductQuickView";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductFilters, {
  parseFiltersFromURL,
  encodeFiltersToURL,
  type ProductFilterState,
} from "@/components/products/ProductFilters";
import type {
  Product,
  Category,
  PaginationMeta,
  PaginationParams,
} from "@/types";

function ProductsListContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const domain = params.domain as string;
  const t = useTranslations("storefront");
  const tA11y = useTranslations("accessibility.buttons");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(
    null,
  );
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Read state from URL
  const page = Number(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("search") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "created_at";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") ?? "desc";
  const [filters, setFilters] = useState<ProductFilterState>(() =>
    parseFiltersFromURL(searchParams),
  );

  // Local search input (for debounce)
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Fetch categories for filter panel
  useEffect(() => {
    storefrontService
      .getCategories(domain)
      .then((res) => {
        if (res.data) {
          // Flatten categories tree for filter display
          const flatCategories = flattenCategories(
            Array.isArray(res.data) ? res.data : [res.data],
          );
          setCategories(flatCategories);
        }
      })
      .catch(() => {
        // Silently fail - categories filter just won't show
      });
  }, [domain]);

  // Fetch products based on current URL state
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams: Record<string, string> = {
        page: String(page),
        limit: "20",
        sortBy,
        sortOrder,
      };

      // Add filter params
      if (filters.minPrice) {
        queryParams.minPrice = String(filters.minPrice);
      }
      if (filters.maxPrice) {
        queryParams.maxPrice = String(filters.maxPrice);
      }
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        queryParams.category = filters.categoryIds.join(",");
      }
      if (filters.availability) {
        queryParams.availability = filters.availability;
      }

      let response;
      if (searchQuery && searchQuery.trim()) {
        response = await storefrontService.searchProducts(
          domain,
          searchQuery.trim(),
          queryParams as unknown as PaginationParams,
        );
      } else {
        response = await storefrontService.getProducts(
          domain,
          queryParams as unknown as PaginationParams,
        );
      }

      setProducts(response.data);
      setMeta(response.meta);
    } catch {
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  }, [domain, page, sortBy, sortOrder, searchQuery, filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sync filters from URL when searchParams change (e.g., browser back/forward)
  useEffect(() => {
    const urlFilters = parseFiltersFromURL(searchParams);
    setFilters(urlFilters);
  }, [searchParams]);

  // Update URL helper
  const updateURL = useCallback(
    (updates: Record<string, string | undefined>) => {
      const currentParams = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          currentParams.delete(key);
        } else {
          currentParams.set(key, value);
        }
      });

      const queryString = currentParams.toString();
      const newURL = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(newURL, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateURL({ search: value || undefined, page: undefined });
    }, 300);
  };

  const handleSortChange = (value: string) => {
    const [field, order] = value.split(":");
    updateURL({ sortBy: field, sortOrder: order, page: undefined });
  };

  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage > 1 ? String(newPage) : undefined });
  };

  // Handle filter changes from ProductFilters component
  const handleFilterChange = useCallback((newFilters: ProductFilterState) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground mb-6">
        {t("allProducts")}
      </h1>

      {/* Search and Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchProducts")}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Sort */}
        <Select
          value={`${sortBy}:${sortOrder}`}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">{t("newest")}</SelectItem>
            <SelectItem value="created_at:asc">{t("oldest")}</SelectItem>
            <SelectItem value="base_price:asc">{t("priceLowHigh")}</SelectItem>
            <SelectItem value="base_price:desc">{t("priceHighLow")}</SelectItem>
            <SelectItem value="name:asc">{t("nameAZ")}</SelectItem>
            <SelectItem value="name:desc">{t("nameZA")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content: Filters Sidebar + Products Grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <ProductFilters
            categories={categories}
            onFilterChange={handleFilterChange}
          />
        </aside>

        {/* Products Area */}
        <div className="flex-1">
          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <EmptyState
              title={t("loadError")}
              description={t("loadErrorDesc")}
              action={{
                label: t("retry"),
                onClick: fetchProducts,
              }}
            />
          )}

          {/* Empty State */}
          {!loading && !error && products.length === 0 && (
            <EmptyState
              icon={Package}
              title={t("noProducts")}
              description={
                searchQuery ? t("noSearchResults") : t("noProductsDesc")
              }
            />
          )}

          {/* Products Grid */}
          {!loading && !error && products.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="relative group">
                    <Link
                      href={ROUTES.STOREFRONT.PRODUCT_DETAIL(
                        domain,
                        product.slug,
                      )}
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full overflow-hidden">
                        <div className="aspect-square bg-muted relative">
                          {product.media && product.media.length > 0 ? (
                            <Image
                              src={product.media[0].url}
                              alt={product.media[0].alt_text || product.name}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h2 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                            {product.name}
                          </h2>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">
                              {product.base_price} د.ل
                            </span>
                            {product.compare_at_price && (
                              <span className="text-xs text-muted-foreground line-through">
                                {product.compare_at_price} د.ل
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                    {/* Quick View Button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-md"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setQuickViewProduct(product);
                      }}
                      aria-label={tA11y("quickView")}
                    >
                      <Eye className="h-3.5 w-3.5 me-1" />
                      <span className="text-xs">{t("quickView")}</span>
                    </Button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    {t("previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t("pageOf", { current: page, total: meta.totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= meta.totalPages}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    {t("next")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Product Quick View Modal */}
      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct}
          domain={domain}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
}

/**
 * Flatten a nested categories tree into a flat array for filter display.
 */
function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  for (const cat of categories) {
    result.push(cat);
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children));
    }
  }
  return result;
}

/**
 * Wrapper with Suspense for useSearchParams
 */
export default function ProductsListClient() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ProductsListContent />
    </Suspense>
  );
}
