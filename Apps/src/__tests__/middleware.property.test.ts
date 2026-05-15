/**
 * Property-Based Tests for Middleware Route Protection
 * Uses fast-check to verify route protection properties across all inputs.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// ─── Mock next/server ────────────────────────────────────────────────────────

// We need to mock NextResponse and NextRequest before importing middleware
const mockRedirect = vi.fn();
const mockNext = vi.fn();

vi.mock("next/server", () => {
  return {
    NextResponse: {
      redirect: (...args: unknown[]) => {
        mockRedirect(...args);
        return { type: "redirect", url: args[0] };
      },
      next: (...args: unknown[]) => {
        mockNext(...args);
        return { type: "next" };
      },
    },
  };
});

// Import middleware after mocking
import { middleware } from "@/middleware";

// ─── Helper to create mock NextRequest ───────────────────────────────────────

function createMockRequest(
  pathname: string,
  hasRefreshToken: boolean,
): unknown {
  return {
    nextUrl: {
      pathname,
    },
    url: `http://localhost:3000${pathname}`,
    cookies: {
      get: (name: string) => {
        if (name === "refresh_token" && hasRefreshToken) {
          return { name: "refresh_token", value: "mock-token" };
        }
        return undefined;
      },
    },
  };
}

// ─── Generators ──────────────────────────────────────────────────────────────

/** Auth pages that authenticated users should be redirected away from */
const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

/** Platform admin routes */
const PLATFORM_PREFIXES = ["/platform"];

/** Store admin routes */
const STORE_ADMIN_PATHS = [
  "/dashboard",
  "/products",
  "/orders",
  "/customers",
  "/coupons",
  "/inventory",
  "/members",
  "/roles",
  "/settings",
  "/stores",
  "/categories",
];

/** All protected routes (platform + store admin) */
const ALL_PROTECTED_ROUTES = [...PLATFORM_PREFIXES, ...STORE_ADMIN_PATHS];

/** All known route prefixes (auth + protected) */
const ALL_KNOWN_ROUTES = [...AUTH_PAGES, ...ALL_PROTECTED_ROUTES];

/** Generates a random sub-path segment */
const subPathArb = fc.oneof(
  fc.constant(""),
  fc
    .stringOf(
      fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-_".split("")),
      {
        minLength: 1,
        maxLength: 10,
      },
    )
    .map((s) => `/${s}`),
);

/** Generates a protected route (platform or store-admin) */
const protectedRouteArb = fc
  .tuple(fc.constantFrom(...ALL_PROTECTED_ROUTES), subPathArb)
  .map(([base, sub]) => `${base}${sub}`);

/** Generates an auth page route */
const authPageArb = fc
  .tuple(fc.constantFrom(...AUTH_PAGES), subPathArb)
  .map(([base, sub]) => `${base}${sub}`);

/**
 * Generates a storefront route — a path whose first segment doesn't match
 * any known application route. E.g., /my-store, /shop-domain/products
 */
const storefrontDomainArb = fc
  .stringOf(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-".split("")),
    {
      minLength: 2,
      maxLength: 15,
    },
  )
  .filter((domain) => {
    const asPath = `/${domain}`;
    // Must not match any known route
    return !ALL_KNOWN_ROUTES.some((route) => asPath === route);
  });

const storefrontRouteArb = fc
  .tuple(storefrontDomainArb, subPathArb)
  .map(([domain, sub]) => `/${domain}${sub}`);

/** Generates API routes */
const apiRouteArb = fc
  .stringOf(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789/-_".split("")),
    {
      minLength: 1,
      maxLength: 20,
    },
  )
  .map((path) => `/api/${path}`);

/** Generates static/internal Next.js routes */
const staticRouteArb = fc.constantFrom(
  "/_next/static/chunks/main.js",
  "/_next/image?url=test.png",
  "/favicon.ico",
  "/_next/static/css/app.css",
);

// ─── Property 13: Middleware Route Protection ────────────────────────────────
// **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

describe("Property 13: Middleware Route Protection", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockNext.mockClear();
  });

  it("unauthenticated users are redirected to /login for any protected route", () => {
    fc.assert(
      fc.property(protectedRouteArb, (route) => {
        mockRedirect.mockClear();
        mockNext.mockClear();

        const request = createMockRequest(route, false);
        const result = middleware(request as any) as any;

        // Should redirect to /login
        expect(result.type).toBe("redirect");
        expect(mockRedirect).toHaveBeenCalledTimes(1);

        // Verify the redirect URL is /login
        const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
        expect(redirectUrl.pathname).toBe("/login");
      }),
      { numRuns: 200 },
    );
  });

  it("authenticated users are redirected to /dashboard for any auth page", () => {
    fc.assert(
      fc.property(authPageArb, (route) => {
        mockRedirect.mockClear();
        mockNext.mockClear();

        const request = createMockRequest(route, true);
        const result = middleware(request as any) as any;

        // Should redirect to /dashboard
        expect(result.type).toBe("redirect");
        expect(mockRedirect).toHaveBeenCalledTimes(1);

        // Verify the redirect URL is /dashboard
        const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
        expect(redirectUrl.pathname).toBe("/dashboard");
      }),
      { numRuns: 200 },
    );
  });

  it("storefront routes are always allowed regardless of auth state", () => {
    fc.assert(
      fc.property(
        storefrontRouteArb,
        fc.boolean(),
        (route, isAuthenticated) => {
          mockRedirect.mockClear();
          mockNext.mockClear();

          const request = createMockRequest(route, isAuthenticated);
          const result = middleware(request as any) as any;

          // Should always pass through (NextResponse.next())
          expect(result.type).toBe("next");
          expect(mockRedirect).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 200 },
    );
  });

  it("authenticated users can access protected routes without redirect", () => {
    fc.assert(
      fc.property(protectedRouteArb, (route) => {
        mockRedirect.mockClear();
        mockNext.mockClear();

        const request = createMockRequest(route, true);
        const result = middleware(request as any) as any;

        // Should pass through (NextResponse.next())
        expect(result.type).toBe("next");
        expect(mockRedirect).not.toHaveBeenCalled();
      }),
      { numRuns: 200 },
    );
  });

  it("unauthenticated users can access auth pages without redirect", () => {
    fc.assert(
      fc.property(authPageArb, (route) => {
        mockRedirect.mockClear();
        mockNext.mockClear();

        const request = createMockRequest(route, false);
        const result = middleware(request as any) as any;

        // Should pass through (NextResponse.next())
        expect(result.type).toBe("next");
        expect(mockRedirect).not.toHaveBeenCalled();
      }),
      { numRuns: 200 },
    );
  });
});
