"use client";

/**
 * Storefront Home Page
 * Displays featured products and categories for the store.
 * Requirements: 16.1, 16.6
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Package, FolderTree } from "lucide-react";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { ROUTES } from "@/lib/constants/routes";
import { EmptyState, LoadingSkeleton } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product, Category } from "@/types";

export default function StorefrontHomePage() {
  const params = useParams();
  const domain = params.domain as string;
  const t = useTranslations("storefront");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        )}
      </section>
    </div>
  );
}
