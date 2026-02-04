import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  register: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Empty turbopack config to silence warnings when using --webpack flag
  turbopack: {},
  // Enable auth interrupts for forbidden() function
  experimental: {
    authInterrupts: true,
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
  // Webpack configuration to handle RxDB
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Prioritize 'import' condition to ensure ESM is used for dynamic imports
      // This makes webpack use the ESM build from RxDB's exports field
      config.resolve.conditionNames = ['import', 'default'];
      
      // Prefer ESM module field over CommonJS main
      config.resolve.mainFields = ['module', 'main'];
      
      // Provide fallbacks for Node.js modules that RxDB might reference
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
      
      // Provide process polyfill for browser environment
      config.plugins = [
        ...(config.plugins || []),
        new webpack.ProvidePlugin({
          process: 'process/browser',
        }),
      ];
    }
    return config;
  },
};

export default withSerwist(nextConfig);
