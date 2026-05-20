/**
 * API Client
 * Centralized HTTP client wrapping native fetch with automatic token management,
 * refresh logic, multi-tenancy headers, and retry with exponential backoff.
 *
 * Requirements: 1.4, 1.5, 1.6, 2.6, 2.7, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7
 */

import { API_BASE_URL, API_ENDPOINTS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// In-memory token storage (never persisted to localStorage/sessionStorage)
// ---------------------------------------------------------------------------

let _accessToken: string | null = null;
let _customerToken: string | null = null;
let _refreshPromise: Promise<boolean> | null = null;
export function setAccessToken(token: string | null): void {
  _accessToken = token;
}
let _suppressSessionExpiredRedirect = false;

export function setSuppressSessionExpiredRedirect(value: boolean): void {
  _suppressSessionExpiredRedirect = value;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setCustomerToken(token: string | null): void {
  _customerToken = token;
}

export function getCustomerToken(): string | null {
  return _customerToken;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiClientOptions {
  method?: string;
  body?: unknown;
  storeId?: number;
  headers?: Record<string, string>;
  _isRetry?: boolean;
  skipAuthRedirect?: boolean;
}

// ---------------------------------------------------------------------------
// Refresh helper
// ---------------------------------------------------------------------------

async function attemptRefresh(): Promise<boolean> {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        return false;
      }

      const result = await response.json();

      if (result.data?.accessToken) {
        setAccessToken(result.data.accessToken);
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}
// ---------------------------------------------------------------------------
// Core API client function
// ---------------------------------------------------------------------------

export async function apiClient<T>(
  url: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    storeId,
    headers: customHeaders,
    _isRetry = false,
    skipAuthRedirect = false,
  } = options;

  // Build headers — Content-Type defaults to application/json with override support
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...customHeaders,
  };

  for (const key of Object.keys(headers)) {
    if (!headers[key]) {
      delete headers[key];
    }
  }

  // Attach admin access token if available
  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  } else if (_customerToken) {
    // Fall back to customer token for storefront authenticated requests
    headers["Authorization"] = `Bearer ${_customerToken}`;
  }

  // Attach store context header when storeId is provided
  if (storeId) {
    headers["x-store-id"] = String(storeId);
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: "include",
  };

  // Attach body for non-GET requests
  // Attach body for non-GET requests
  if (body !== undefined && method !== "GET") {
    fetchOptions.body = isFormData
      ? (body as FormData)
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${url}`, fetchOptions);

  // Auto-refresh on 401 with single retry guard
  if (response.status === 401 && !_isRetry) {
    const refreshed = await attemptRefresh();

    if (refreshed) {
      // Retry the original request exactly once
      return apiClient<T>(url, { ...options, _isRetry: true });
    }

    // Refresh failed — clear tokens and redirect to login with session expired flag
    setAccessToken(null);
    setCustomerToken(null);

    if (
      typeof window !== "undefined" &&
      !_suppressSessionExpiredRedirect &&
      !skipAuthRedirect
    ) {
      window.location.href = "/login?session_expired=true";
    }
    throw new Error("Session expired");
  }

  const result = await response.json();

  if (!response.ok) {
    throw result;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Re-export retry utilities for convenience
// ---------------------------------------------------------------------------

export { fetchWithRetry, DEFAULT_RETRY_CONFIG } from "./retry";
export type { RetryConfig } from "./retry";
