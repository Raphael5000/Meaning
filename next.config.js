/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: process.cwd() },
  // Skip TS check at build time — host has only 0.28 GB RAM; we check locally instead
  typescript: { ignoreBuildErrors: true },
  // Lighter production build so it can finish on Code Capsules (avoids timeout/OOM)
  productionBrowserSourceMaps: false,
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'pg'],
  experimental: {
    optimizePackageImports: ['googleapis', '@anthropic-ai/sdk'],
    // Prevent prerender errors from breaking the build on Code Capsules
    prerenderEarlyExit: false,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'fs/promises': false,
        path: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
