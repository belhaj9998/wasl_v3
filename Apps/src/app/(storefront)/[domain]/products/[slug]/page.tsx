/**
 * Storefront Product Detail Page (Server Component wrapper)
 * Provides generateMetadata for SEO, generateStaticParams for ISR,
 * and pre-generates pages for the latest 50 active products per active store.
 * Requirements: 1.2, 1.4
 */

import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-fetch";
import { API_ENDPOINTS } from "@/lib/constants";
import { generateSeoTitle, generateSeoDescription } from "@/lib/utils/metadata";
import type { Product, Store } from "@/types";
import ProductDetailClient from "./ProductDetailClient";

/**
 * ISR revalidation period: 60 seconds.
 * Pages not pre-generated via generateStaticParams will be generated on-demand
 * and cached for 60 seconds before revalidation.
 * Requirements: 1.4
 */
export const revalidate = 60;

/**
 * Allow pages not returned by generateStaticParams to be generated on-demand.
 * New products added after build will still be accessible via ISR.
 */
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ domain: string; slug: string }>;
}

/**
 * generateStaticParams pre-generates product detail pages for the latest 50
 * active products (status = ACTIVE) per active store at build time.
 * Requirements: 1.4
 */
export async function generateStaticParams(): Promise<
  { domain: string; slug: string }[]
> {
  try {
    // Fetch active stores from the platform API
    const storesResult = await serverFetch<{
      data: Store[];
      meta: { total: number };
    }>(`${API_ENDPOINTS.PLATFORM.STORES}?status=ACTIVE&limit=100`);

    if (!storesResult?.data || storesResult.data.length === 0) {
      return [];
    }

    const params: { domain: string; slug: string }[] = [];

    // For each active store, fetch the latest 50 active products
    await Promise.all(
      storesResult.data.map(async (store) => {
        try {
          const productsResult = await serverFetch<{
            data: Product[];
            meta: { total: number };
          }>(
            `${API_ENDPOINTS.STOREFRONT.PRODUCTS(store.domain)}?limit=50&sort_by=created_at&sort_order=desc`,
          );

          if (productsResult?.data) {
            for (const product of productsResult.data) {
              params.push({
                domain: store.domain,
                slug: product.slug,
              });
            }
          }
        } catch {
          // Skip stores that fail to fetch products — graceful degradation
        }
      }),
    );

    return params;
  } catch {
    // If fetching stores fails (e.g., API not available at build time),
    // return empty array — all pages will be generated on-demand with ISR
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { domain, slug } = await params;

  const result = await serverFetch<{ data: Product }>(
    `${API_ENDPOINTS.STOREFRONT.PRODUCTS(domain)}/${slug}`,
  );

  if (!result?.data) {
    return {
      title: slug,
    };
  }

  const product = result.data;
  const title = generateSeoTitle(product.name);
  const description = generateSeoDescription(
    product.short_description || product.description || product.name,
  );

  return {
    title,
    description,
  };
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}
