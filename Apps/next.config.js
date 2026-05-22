/** @type {import('next').NextConfig} */

// Build Content Security Policy based on environment
const isDev = process.env.NODE_ENV === "development";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6200/api";

// Extract origin from API URL for connect-src (e.g., http://localhost:6200)
const apiOrigin = (() => {
  try {
    const url = new URL(apiUrl);
    return url.origin;
  } catch {
    return apiUrl;
  }
})();

// CSP directives
const cspDirectives = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for hydration inline scripts
  // In dev, 'unsafe-eval' is needed for hot reload / Fast Refresh
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : " 'unsafe-inline'"}`,
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${apiOrigin}`,
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const contentSecurityPolicy = cspDirectives.join("; ");

// Security headers applied to all routes
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  // Enable React strict mode for development
  reactStrictMode: true,

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Proxy uploaded files from the API server so relative /uploads URLs render
  // correctly inside the Next.js app.
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },

  // Typed routes disabled — dynamic route patterns from ROUTES constants
  // are not compatible with Next.js static route type generation
  // typedRoutes: true,
};

module.exports = nextConfig;
