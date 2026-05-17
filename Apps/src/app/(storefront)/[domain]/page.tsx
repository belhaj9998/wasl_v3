/**
 * Storefront Home Page (Server Component wrapper)
 * Provides generateMetadata for SEO using store name and description.
 * Requirements: 1.2
 */

import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-fetch";
import { API_ENDPOINTS } from "@/lib/constants";
import { generateSeoTitle, generateSeoDescription } from "@/lib/utils/metadata";
import type { Store } from "@/types";
import StorefrontHomeClient from "./StorefrontHomeClient";

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

  if (!result?.data) {
    return {
      title: domain,
    };
  }

  const store = result.data;
  const title = generateSeoTitle(store.meta_title || store.name);
  const description = generateSeoDescription(
    store.meta_description || store.description || store.name,
  );

  return {
    title,
    description,
  };
}

export default function StorefrontHomePage() {
  return <StorefrontHomeClient />;
}
