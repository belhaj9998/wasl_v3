"use client";

/**
 * Storefront Products Listing Page
 * Product grid with search, filters, and pagination.
 * Requirements: 16.3, 16.4
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Package, Search } from "lucide-react";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { ROUTES } from "@/lib/constants/routes";
import { EmptyState } from "@/components/shared";
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
import type { Product, PaginationMeta, PaginationParams } from "@/types";

export default function StorefrontProductsPage() {
  const params = useParams();
  const domain = params.domain as string;
  const t = useTranslations("storefront");

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProducts = useCallback(
    async (search?: string, currentPage?: number) => {
      try {
        setLoading(true);
        setError(null);

        const p = currentPage ?? page;
        const queryParams: PaginationParams = {
          page: p,
          limit: 20,
          sortBy,
          sortOrder,
        };

        let response;
        if (search && search.trim()) {
          response = await storefrontService.searchProducts(
            domain,
            search.trim(),
            queryParams as Record<string, string>,
          );
        } else {
          response = await storefrontService.getProducts(domain, queryParams);
        }

        setProducts(response.data);
        setMeta(response.meta);
      } catch {
        setError("load_failed");
      } finally {
        setLoading(false);
      }
    },
    [domain, page, sortBy, sortOrder],
  );

  useEffect(() => {
    fetchProducts(searchQuery, page);
  }, [page, sortBy, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchProducts(value, 1);
    }, 300);
  };

  const handleSortChange = (value: string) => {
    const [field, order] = value.split(":");
    setSortBy(field);
    setSortOrder(order as "asc" | "desc");
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground mb-6">
        {t("allProducts")}
      </h1>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchProducts")}
            value={searchQuery}
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

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
            onClick: () => fetchProducts(searchQuery, page),
          }}
        />
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <EmptyState
          icon={Package}
          title={t("noProducts")}
          description={searchQuery ? t("noSearchResults") : t("noProductsDesc")}
        />
      )}

      {/* Products Grid */}
      {!loading && !error && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={ROUTES.STOREFRONT.PRODUCT_DETAIL(domain, product.slug)}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full overflow-hidden">
                  <div className="aspect-square bg-muted relative">
                    {product.media && product.media.length > 0 ? (
                      <img
                        src={product.media[0].url}
                        alt={product.media[0].alt_text || product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                      {product.name}
                    </h3>
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
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
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
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
