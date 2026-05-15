/**
 * Property-Based Tests for API Client
 *
 * Validates: Requirements 1.4, 26.2, 26.3, 26.4
 *
 * Property 1: Token Refresh Idempotency — For any request receiving 401,
 *   refresh fires at most once and original request retried at most once.
 * Property 9: Store Context Header Attachment — For any request with storeId,
 *   headers contain `x-store-id` matching String(storeId).
 * Property 10: API Client Credentials Inclusion — All requests include
 *   `credentials: "include"`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { apiClient, setAccessToken, setCustomerToken } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  setAccessToken(null);
  setCustomerToken(null);

  // Mock window.location to prevent errors on redirect
  Object.defineProperty(globalThis, "window", {
    value: { location: { href: "" } },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Property 1: Token Refresh Idempotency
// **Validates: Requirements 1.4**
// ---------------------------------------------------------------------------

describe("Property 1: Token Refresh Idempotency", () => {
  it("for any request receiving 401, refresh fires at most once and original request retried at most once", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.stringMatching(/^\/[a-z][a-z0-9]{0,10}$/),
          method: fc.constantFrom("GET", "POST", "PUT", "PATCH", "DELETE"),
        }),
        async ({ endpoint, method }) => {
          // Reset token state for each run
          setAccessToken("test-token");

          const calls: { url: string; options: RequestInit }[] = [];
          let originalCallCount = 0;

          const mockFetch = vi.fn(
            async (url: string | URL | Request, init?: RequestInit) => {
              const urlStr = String(url);
              const opts = init || {};
              calls.push({ url: urlStr, options: opts });

              // Refresh endpoint — always succeed
              if (urlStr.includes("/auth/refresh")) {
                return new Response(
                  JSON.stringify({ data: { accessToken: "new-token" } }),
                  {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                  },
                );
              }

              // Original endpoint: first call returns 401, subsequent calls succeed
              originalCallCount++;
              if (originalCallCount === 1) {
                return new Response(
                  JSON.stringify({ message: "Unauthorized" }),
                  {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                  },
                );
              }

              return new Response(JSON.stringify({ data: "success" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            },
          );

          vi.stubGlobal("fetch", mockFetch);

          const result = await apiClient(endpoint, { method });

          // Count refresh calls
          const refreshCalls = calls.filter((c) =>
            c.url.includes("/auth/refresh"),
          );
          // Count original endpoint calls
          const originalCalls = calls.filter(
            (c) => !c.url.includes("/auth/refresh"),
          );

          // Property: refresh fires at most once
          expect(refreshCalls.length).toBeLessThanOrEqual(1);

          // Property: original request retried at most once (initial + retry = 2 max)
          expect(originalCalls.length).toBeLessThanOrEqual(2);

          // Verify the result is the successful response
          expect(result).toEqual({ data: "success" });

          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 50 },
    );
  });

  it("when refresh fails, does not retry the original request", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.stringMatching(/^\/[a-z][a-z0-9]{0,10}$/),
        }),
        async ({ endpoint }) => {
          setAccessToken("some-token");

          const calls: { url: string; options: RequestInit }[] = [];

          const mockFetch = vi.fn(
            async (url: string | URL | Request, init?: RequestInit) => {
              const urlStr = String(url);
              calls.push({ url: urlStr, options: init || {} });

              // Refresh endpoint — fail
              if (urlStr.includes("/auth/refresh")) {
                return new Response(
                  JSON.stringify({ message: "Refresh failed" }),
                  {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                  },
                );
              }

              // Original endpoint returns 401
              return new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
              });
            },
          );

          vi.stubGlobal("fetch", mockFetch);

          await expect(apiClient(endpoint)).rejects.toThrow("Session expired");

          // Count calls
          const originalCalls = calls.filter(
            (c) => !c.url.includes("/auth/refresh"),
          );
          const refreshCalls = calls.filter((c) =>
            c.url.includes("/auth/refresh"),
          );

          // Property: original request called exactly once (no retry after failed refresh)
          expect(originalCalls.length).toBe(1);
          // Property: refresh attempted exactly once
          expect(refreshCalls.length).toBe(1);

          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Store Context Header Attachment
// **Validates: Requirements 26.2, 26.3**
// ---------------------------------------------------------------------------

describe("Property 9: Store Context Header Attachment", () => {
  it("for any request with storeId, headers contain x-store-id matching String(storeId)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.stringMatching(/^\/[a-z][a-z0-9]{0,10}$/),
          storeId: fc.integer({ min: 1, max: 999999 }),
          method: fc.constantFrom("GET", "POST", "PUT", "PATCH", "DELETE"),
        }),
        async ({ endpoint, storeId, method }) => {
          let capturedHeaders: Record<string, string> | undefined;

          const mockFetch = vi.fn(
            async (url: string | URL | Request, init?: RequestInit) => {
              capturedHeaders = init?.headers as Record<string, string>;
              return new Response(JSON.stringify({ data: "ok" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            },
          );

          vi.stubGlobal("fetch", mockFetch);

          await apiClient(endpoint, { method, storeId });

          // Property: x-store-id header is present and matches String(storeId)
          expect(capturedHeaders).toBeDefined();
          expect(capturedHeaders!["x-store-id"]).toBe(String(storeId));

          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("when storeId is not provided, x-store-id header is absent", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.stringMatching(/^\/[a-z][a-z0-9]{0,10}$/),
          method: fc.constantFrom("GET", "POST", "PUT", "PATCH", "DELETE"),
        }),
        async ({ endpoint, method }) => {
          let capturedHeaders: Record<string, string> | undefined;

          const mockFetch = vi.fn(
            async (url: string | URL | Request, init?: RequestInit) => {
              capturedHeaders = init?.headers as Record<string, string>;
              return new Response(JSON.stringify({ data: "ok" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            },
          );

          vi.stubGlobal("fetch", mockFetch);

          await apiClient(endpoint, { method });

          // Property: x-store-id header is NOT present when storeId is not provided
          expect(capturedHeaders).toBeDefined();
          expect(capturedHeaders!["x-store-id"]).toBeUndefined();

          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: API Client Credentials Inclusion
// **Validates: Requirements 26.4**
// ---------------------------------------------------------------------------

describe("Property 10: API Client Credentials Inclusion", () => {
  it("all requests include credentials: 'include'", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.stringMatching(/^\/[a-z][a-z0-9]{0,10}$/),
          method: fc.constantFrom("GET", "POST", "PUT", "PATCH", "DELETE"),
          storeId: fc.option(fc.integer({ min: 1, max: 999999 }), {
            nil: undefined,
          }),
          hasToken: fc.boolean(),
          hasBody: fc.boolean(),
        }),
        async ({ endpoint, method, storeId, hasToken, hasBody }) => {
          if (hasToken) {
            setAccessToken("token-xyz");
          } else {
            setAccessToken(null);
          }

          let capturedCredentials: RequestCredentials | undefined;

          const mockFetch = vi.fn(
            async (url: string | URL | Request, init?: RequestInit) => {
              capturedCredentials = init?.credentials;
              return new Response(JSON.stringify({ data: "ok" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            },
          );

          vi.stubGlobal("fetch", mockFetch);

          const options: Record<string, unknown> = { method };
          if (storeId !== undefined) {
            options.storeId = storeId;
          }
          if (hasBody && method !== "GET") {
            options.body = { key: "value" };
          }

          await apiClient(endpoint, options);

          // Property: credentials is always "include"
          expect(capturedCredentials).toBe("include");

          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("credentials included even during token refresh flow", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.stringMatching(/^\/[a-z][a-z0-9]{0,10}$/),
        }),
        async ({ endpoint }) => {
          setAccessToken("expired-token");

          const allCredentials: (RequestCredentials | undefined)[] = [];
          let originalCallCount = 0;

          const mockFetch = vi.fn(
            async (url: string | URL | Request, init?: RequestInit) => {
              allCredentials.push(init?.credentials);
              const urlStr = String(url);

              if (urlStr.includes("/auth/refresh")) {
                return new Response(
                  JSON.stringify({ data: { accessToken: "fresh-token" } }),
                  {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                  },
                );
              }

              // First call returns 401, retry succeeds
              originalCallCount++;
              if (originalCallCount === 1) {
                return new Response(
                  JSON.stringify({ message: "Unauthorized" }),
                  {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                  },
                );
              }

              return new Response(JSON.stringify({ data: "refreshed" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            },
          );

          vi.stubGlobal("fetch", mockFetch);

          await apiClient(endpoint);

          // Property: ALL fetch calls (original, refresh, retry) include credentials: "include"
          expect(allCredentials.length).toBeGreaterThanOrEqual(2);
          for (const cred of allCredentials) {
            expect(cred).toBe("include");
          }

          vi.unstubAllGlobals();
        },
      ),
      { numRuns: 50 },
    );
  });
});
