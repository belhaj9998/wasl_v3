"use client";

/**
 * Storefront Categories List Page
 * Shows all categories of the store as cards.
 * Clicking a card navigates to that category's products page.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FolderTree } from "lucide-react";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { ROUTES } from "@/lib/constants/routes";
import { EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@/types";

export default function StorefrontCategoriesPage() {
  const params = useParams();
  const domain = params.domain as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      try {
        setLoading(true);
        setError(null);
        const res = await storefrontService.getCategories(domain);
        if (!cancelled) {
          setCategories(res.data.categories ?? []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const apiError = err as { message?: string };
          setError(apiError.message ?? "تعذر تحميل الأقسام");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, [domain]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">الأقسام</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          تصفح كل أقسام المتجر
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="تعذر تحميل الأقسام"
          description={error}
          action={{
            label: "إعادة المحاولة",
            onClick: () => window.location.reload(),
          }}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="لا توجد أقسام"
          description="لم تتم إضافة أي أقسام لهذا المتجر بعد."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={ROUTES.STOREFRONT.CATEGORY(domain, category.slug)}
              className="group"
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                <div className="aspect-square bg-muted relative">
                  {category.image_url ? (
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderTree className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  {/* Overlay with category name */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
                    <h3 className="text-base font-semibold text-white text-center">
                      {category.name}
                    </h3>
                  </div>
                </div>
                {category.description && (
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
