/**
 * Storefront Category Page (Server Component wrapper)
 * Provides generateMetadata for SEO using category name and description.
 * Requirements: 1.2
 */

import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-fetch";
import { API_ENDPOINTS } from "@/lib/constants";
import { generateSeoTitle, generateSeoDescription } from "@/lib/utils/metadata";
import type { Category } from "@/types";
import CategoryPageClient from "./CategoryPageClient";

interface PageProps {
  params: Promise<{ domain: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { domain, slug } = await params;

  const result = await serverFetch<{ data: Category }>(
    `${API_ENDPOINTS.STOREFRONT.CATEGORIES(domain)}/${slug}`,
  );

  if (!result?.data) {
    return {
      title: slug,
    };
  }

  const category = result.data;
  const title = generateSeoTitle(category.name);
  const description = generateSeoDescription(
    category.description || category.name,
  );

  return {
    title,
    description,
  };
}

export default function CategoryPage() {
  return <CategoryPageClient />;
}
