"use client";

/**
 * Storefront Layout
 * Provides the shell for all storefront pages: header with store name,
 * navigation, cart icon, and footer. Fetches store info from API.
 * Requirements: 16.1, 16.2
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAppSelector } from "@/lib/store/hooks";
import { storefrontService } from "@/lib/api/services/storefront.service";
import { StorefrontHeader } from "@/components/layouts/StorefrontHeader";
import { StorefrontFooter } from "@/components/layouts/StorefrontFooter";
import { EmptyState } from "@/components/shared";
import { MiniCartPopup } from "@/components/shared/MiniCartPopup";
import { Skeleton } from "@/components/ui/skeleton";
import type { Store, Category } from "@/types";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const domain = params.domain as string;
  const t = useTranslations("storefront");
  const direction = useAppSelector((state) => state.ui.direction);

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStoreInfo() {
      try {
        setLoading(true);
        setError(null);

        const [storeRes, categoriesRes] = await Promise.all([
          storefrontService.getStore(domain),
          storefrontService.getCategories(domain),
        ]);

        if (!cancelled) {
          setStore(storeRes.data.store);
          setCategories(categoriesRes.data.categories ?? []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const apiError = err as { status?: number; message?: string };
          if (apiError.status === 404) {
            setError("store_not_found");
          } else if (apiError.status === 403) {
            setError("store_inactive");
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

    fetchStoreInfo();
    return () => {
      cancelled = true;
    };
  }, [domain]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" dir={direction}>
        {/* Header skeleton */}
        <div className="h-16 border-b bg-card flex items-center px-4 gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        {/* Content skeleton */}
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        dir={direction}
      >
        <EmptyState
          title={
            error === "store_not_found"
              ? t("storeNotFound")
              : error === "store_inactive"
                ? t("storeInactive")
                : t("loadError")
          }
          description={
            error === "store_not_found"
              ? t("storeNotFoundDesc")
              : error === "store_inactive"
                ? t("storeInactiveDesc")
                : t("loadErrorDesc")
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" dir={direction}>
      <StorefrontHeader store={store} categories={categories} domain={domain} />
      <main className="flex-1">{children}</main>
      <StorefrontFooter store={store} domain={domain} />
      <MiniCartPopup />
    </div>
  );
}
