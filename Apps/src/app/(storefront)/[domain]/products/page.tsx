/**
 * Storefront Products Listing Page (Server Component wrapper)
 * Provides generateMetadata for SEO using store name.
 * Requirements: 1.2
 */

import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-fetch";
import { API_ENDPOINTS } from "@/lib/constants";
import { generateSeoTitle, generateSeoDescription } from "@/lib/utils/metadata";
import type { Store } from "@/types";
import ProductsListClient from "./ProductsListClient";

interface PageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { domain } = await params;

  const result = await serverFetch<{ data: Store }>(
    API_ENDPOINTS.STOREFRONT.STORE_INFO(domain),
  );

  const storeName = result?.data?.name || domain;
  const title = generateSeoTitle(`${storeName} - المنتجات`);
  const description = generateSeoDescription(`تصفح جميع منتجات ${storeName}`);

  return {
    title,
    description,
  };
}

export default function ProductsPage() {
  return <ProductsListClient />;
}
