/**
 * Retry with Exponential Backoff
 * Provides automatic retry logic for transient failures on GET requests.
 *
 * Requirements: 2.6, 2.7
 */

import { apiClient, type ApiClientOptions } from "./client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds before first retry */
  baseDelay: number;
  /** Multiplier applied to delay for each subsequent retry */
  multiplier: number;
  /** HTTP status codes that trigger a retry */
  retryableStatuses: number[];
  /** HTTP methods that are safe to retry */
  retryableMethods: string[];
}

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  multiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableMethods: ["GET"],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a promise that resolves after the specified delay in milliseconds.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates the delay for a given attempt using exponential backoff.
 * attempt 0 → baseDelay * multiplier^0 = baseDelay
 * attempt 1 → baseDelay * multiplier^1
 * attempt 2 → baseDelay * multiplier^2
 */
export function calculateBackoff(attempt: number, config: RetryConfig): number {
  return config.baseDelay * Math.pow(config.multiplier, attempt);
}

/**
 * Determines whether a failed request should be retried based on:
 * - The HTTP method (only retryable methods like GET)
 * - The error status code (only retryable statuses)
 */
export function shouldRetry(
  error: unknown,
  method: string | undefined,
  config: RetryConfig,
): boolean {
  const requestMethod = (method ?? "GET").toUpperCase();

  // Only retry safe/idempotent methods
  if (!config.retryableMethods.includes(requestMethod)) {
    return false;
  }

  // Check if the error has a retryable status code
  const status = getErrorStatus(error);
  if (status !== null && config.retryableStatuses.includes(status)) {
    return true;
  }

  // Retry on network errors (no status code available)
  if (isNetworkError(error)) {
    return true;
  }

  return false;
}

/**
 * Extracts the HTTP status code from an error object.
 * Supports various error shapes from the API client.
 */
function getErrorStatus(error: unknown): number | null {
  if (error == null) return null;

  if (typeof error === "object") {
    const err = error as Record<string, unknown>;

    // Direct status property (from API response errors)
    if (typeof err.status === "number") return err.status;
    if (typeof err.statusCode === "number") return err.statusCode;

    // Nested response object
    if (
      err.response &&
      typeof err.response === "object" &&
      typeof (err.response as Record<string, unknown>).status === "number"
    ) {
      return (err.response as Record<string, unknown>).status as number;
    }
  }

  return null;
}

/**
 * Determines if an error is a network-level error (no response received).
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // fetch throws TypeError for network failures
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("aborted") ||
      message.includes("timeout")
    );
  }

  return false;
}

// ---------------------------------------------------------------------------
// Core Retry Function
// ---------------------------------------------------------------------------

/**
 * Wraps the API client with retry logic using exponential backoff.
 *
 * - Only retries GET requests (configurable via retryableMethods)
 * - Only retries on specific status codes: 408, 429, 500, 502, 503, 504
 * - Does NOT retry POST/PUT/PATCH/DELETE to avoid duplicate mutations
 * - Backoff schedule: 1s, 2s, 4s (baseDelay * multiplier^attempt)
 *
 * @param url - API endpoint path
 * @param options - Fetch options (method, body, headers, etc.)
 * @param config - Retry configuration (uses defaults if not provided)
 * @returns The API response of type T
 * @throws The last error if all retry attempts are exhausted
 */
export async function fetchWithRetry<T>(
  url: string,
  options: ApiClientOptions = {},
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await apiClient<T>(url, options);
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt >= config.maxRetries;
      if (!isLastAttempt && shouldRetry(error, options.method, config)) {
        const backoffDelay = calculateBackoff(attempt, config);
        await delay(backoffDelay);
      } else {
        // Not retryable or last attempt — throw immediately
        throw error;
      }
    }
  }

  // This should not be reached, but TypeScript needs it
  throw lastError;
}
