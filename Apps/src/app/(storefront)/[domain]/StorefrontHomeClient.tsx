"use client";

/**
 * Storefront Home Page
 * Displays featured products and categories for the store.
 * Requirements: 16.1, 16.6
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Package, FolderTree, Eye } from "lucide-react";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { ROUTES } from "@/lib/constants/routes";
import { EmptyState, LoadingSkeleton } from "@/components/shared";
import { ProductQuickView } from "@/components/storefront/ProductQuickView";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyLYD } from "@/lib/i18n/formatters";
import type { SupportedLocale } from "@/lib/i18n/config";
import type { Product, Category } from "@/types";

export default function StorefrontHomeClient() {
  const params = useParams();
  const domain = params.domain as string;
  const t = useTranslations("storefront");
  const locale = useLocale() as SupportedLocale;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(
    null,
  );
  const tA11y = useTranslations("accessibility.buttons");

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [productsRes, categoriesRes] = await Promise.all([
          storefrontService.getProducts(domain, { page: 1, limit: 8 }),
          storefrontService.getCategories(domain),
        ]);

        if (!cancelled) {
          setProducts(productsRes.data);
          setCategories(categoriesRes.data);
        }
      } catch {
        if (!cancelled) {
          setError("load_failed");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [domain]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
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
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          title={t("loadError")}
          description={t("loadErrorDesc")}
          action={{
            label: t("retry"),
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Visually hidden h1 for accessibility - store home page */}
      <h1 className="sr-only">{t("storeHome")}</h1>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {t("categories")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={ROUTES.STOREFRONT.CATEGORY(domain, category.slug)}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="h-16 w-16 rounded-lg object-cover mb-3"
                      />
                    ) : (
                      <FolderTree className="h-10 w-10 text-muted-foreground mb-3" />
                    )}
                    <h3 className="text-sm font-medium text-foreground">
                      {category.name}
                    </h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {t("featuredProducts")}
          </h2>
          <Link href={ROUTES.STOREFRONT.PRODUCTS(domain)}>
            <Button variant="outline" size="sm">
              {t("viewAll")}
            </Button>
          </Link>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("noProducts")}
            description={t("noProductsDesc")}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div key={product.id} className="relative group">
                <Link
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
                          {formatCurrencyLYD(
                            Number(product.base_price),
                            locale,
                          )}
                        </span>
                        {product.compare_at_price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrencyLYD(
                              Number(product.compare_at_price),
                              locale,
                            )}
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
        )}
      </section>

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
