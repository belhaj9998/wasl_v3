import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware — Route Protection
 *
 * Checks the `refresh_token` httpOnly cookie to determine auth state.
 * - Unauthenticated users are redirected away from protected routes to /login
 * - Authenticated users are redirected away from auth pages to /dashboard
 * - Storefront routes are always accessible without authentication
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

// Auth pages that authenticated users should be redirected away from
const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

// Platform admin routes (route group: (platform))
const PLATFORM_PREFIXES = ["/platform"];

// Store admin routes (route group: (store-admin)) — all under /admin prefix
const STORE_ADMIN_PATHS = [
  "/admin/dashboard",
  "/admin/products",
  "/admin/orders",
  "/admin/customers",
  "/admin/coupons",
  "/admin/inventory",
  "/admin/members",
  "/admin/roles",
  "/admin/settings",
  "/admin/categories",
];

/**
 * Checks if a pathname is a protected route requiring authentication.
 */
function isProtectedRoute(pathname: string): boolean {
  // Check platform admin routes
  if (PLATFORM_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  // Check store admin routes
  if (
    STORE_ADMIN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a pathname is an auth page.
 */
function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
}

/**
 * Checks if a pathname is a storefront route.
 * Storefront routes follow the pattern /{domain}/... where domain is a single
 * segment that doesn't match any known application route.
 */
function isStorefrontRoute(pathname: string): boolean {
  // Remove leading slash and split
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return false;
  }

  const firstSegment = `/${segments[0]}`;

  // If the first segment matches a known route prefix, it's not a storefront route
  const knownRoutes = [
    ...AUTH_PAGES,
    ...PLATFORM_PREFIXES,
    ...STORE_ADMIN_PATHS,
  ];

  // Check if the pathname starts with any known route or if the first segment matches
  if (
    knownRoutes.some(
      (route) =>
        firstSegment === route ||
        route.startsWith(`${firstSegment}/`) ||
        pathname === route ||
        pathname.startsWith(`${route}/`),
    )
  ) {
    return false;
  }

  // If it's a single segment or multi-segment path that doesn't match known routes,
  // treat it as a storefront route (/{domain} or /{domain}/products, etc.)
  return true;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for refresh_token cookie to determine auth state
  const refreshToken = request.cookies.get("refresh_token");
  const isAuthenticated = !!refreshToken;

  // Allow storefront routes without authentication (Requirement 2.3)
  if (isStorefrontRoute(pathname)) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users from protected routes to /login (Requirement 2.1)
  if (!isAuthenticated && isProtectedRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth pages to /admin/dashboard (Requirement 2.2)
  if (isAuthenticated && isAuthPage(pathname)) {
    const dashboardUrl = new URL("/admin/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Skip middleware for static files, images, favicon, and API routes (Requirement 2.4)
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /api (API routes)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api).*)",
  ],
};
