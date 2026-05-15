/** @type {import('next').NextConfig} */
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

  // Typed routes disabled — dynamic route patterns from ROUTES constants
  // are not compatible with Next.js static route type generation
  // typedRoutes: true,
};

module.exports = nextConfig;
