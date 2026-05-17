/**
 * Server-side fetch utility for use in Server Components and generateMetadata.
 * Does not rely on in-memory tokens — suitable for public endpoints.
 * Requirements: 1.2
 */

import { API_BASE_URL } from "@/lib/constants";

/**
 * Fetches data from the API on the server side.
 * Returns null if the request fails (graceful degradation for metadata).
 */
export async function serverFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result;
  } catch {
    return null;
  }
}
