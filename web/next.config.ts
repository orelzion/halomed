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
