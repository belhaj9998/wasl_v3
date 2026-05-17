"use client";

/**
 * Storefront Category Page
 * Shows products filtered by category.
 * Requirements: 16.1, 16.6
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Package } from "lucide-react";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { ROUTES } from "@/lib/constants/routes";
import { EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product, Category } from "@/types";

export default function CategoryPageClient() {
  const params = useParams();
  const domain = params.domain as string;
  const slug = params.slug as string;
  const t = useTranslations("storefront");

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [categoryRes, productsRes] = await Promise.all([
          storefrontService.getCategoryBySlug(domain, slug),
          storefrontService.getProducts(domain, {
            page: 1,
            limit: 20,
          }),
        ]);

        if (!cancelled) {
          setCategory(categoryRes.data);
          setProducts(productsRes.data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const apiError = err as { status?: number };
          if (apiError.status === 404) {
            setError("not_found");
          } else {
            setError("load_failed");
          }
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
  }, [domain, slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72 mb-8" />
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

  if (error === "not_found") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          title={t("categoryNotFound")}
          description={t("categoryNotFoundDesc")}
        />
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
      {/* Category Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{category?.name}</h1>
        {category?.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("noProducts")}
          description={t("noCategoryProducts")}
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
          ))}
        </div>
      )}
    </div>
  );
}
