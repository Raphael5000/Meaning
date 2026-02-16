/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: process.cwd() },
  // Lighter production build so it can finish on Code Capsules (avoids timeout/OOM)
  productionBrowserSourceMaps: false,
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'pg'],
  experimental: {
    optimizePackageImports: ['googleapis', '@anthropic-ai/sdk'],
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
