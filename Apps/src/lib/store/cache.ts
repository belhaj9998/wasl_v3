/**
 * Cache utility for Redux store list data.
 * Provides TTL-based caching to avoid redundant API calls
 * when the same data with the same parameters was recently fetched.
 */

/** Time-to-live for cached data: 5 minutes */
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/** A cache entry storing data alongside its fetch timestamp and serialized params */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  params: string; // JSON-serialized params used for the fetch
}

/**
 * Checks whether a cache entry is still valid (not expired).
 * Returns false if entry is null or if the TTL has elapsed.
 */
export function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Creates a new cache entry with the current timestamp.
 */
export function createCacheEntry<T>(data: T, params?: unknown): CacheEntry<T> {
  return {
    data,
    timestamp: Date.now(),
    params: serializeParams(params),
  };
}

/**
 * Serializes params to a stable string for comparison.
 * Handles undefined/null by returning an empty string.
 */
export function serializeParams(params?: unknown): string {
  if (params === undefined || params === null) return "";
  try {
    // Sort keys for stable serialization
    return JSON.stringify(params, Object.keys(params as object).sort());
  } catch {
    return "";
  }
}

/**
 * Checks if the cache is valid AND the params match the cached params.
 * This is the main function thunks should use to decide whether to skip a fetch.
 */
export function shouldUseCachedData<T>(
  cache: CacheEntry<T> | null,
  params?: unknown,
): boolean {
  if (!isCacheValid(cache)) return false;
  return cache!.params === serializeParams(params);
}
