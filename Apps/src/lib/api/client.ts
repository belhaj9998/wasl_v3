/**
 * API Client
 * Centralized HTTP client wrapping native fetch with automatic token management,
 * refresh logic, and multi-tenancy headers.
 *
 * Requirements: 1.4, 1.5, 1.6, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7
 */

import { API_BASE_URL, API_ENDPOINTS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// In-memory token storage (never persisted to localStorage/sessionStorage)
// ---------------------------------------------------------------------------

let _accessToken: string | null = null;
let _customerToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
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
}

// ---------------------------------------------------------------------------
// Refresh helper
// ---------------------------------------------------------------------------

async function attemptRefresh(): Promise<boolean> {
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
  }
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
  } = options;

  // Build headers — Content-Type defaults to application/json with override support
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

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
  if (body !== undefined && method !== "GET") {
    fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${url}`, fetchOptions);

  // Auto-refresh on 401 with single retry guard
  if (response.status === 401 && !_isRetry) {
    const refreshed = await attemptRefresh();

    if (refreshed) {
      // Retry the original request exactly once
      return apiClient<T>(url, { ...options, _isRetry: true });
    }

    // Refresh failed — clear tokens and redirect to login
    setAccessToken(null);
    setCustomerToken(null);

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }

    throw new Error("Session expired");
  }

  const result = await response.json();

  if (!response.ok) {
    throw result;
  }

  return result;
}
