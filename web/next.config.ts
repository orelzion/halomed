import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  // Use webpack for next-pwa compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // PWA service worker generation
    }
    return config;
  },
  // PostHog reverse proxy configuration
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable PWA in development for faster builds
});

// Use webpack explicitly for next-pwa
export default process.env.NODE_ENV === "production" 
  ? pwaConfig(nextConfig)
  : nextConfig;
