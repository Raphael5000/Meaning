/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: process.cwd() },
  // Lighter production build so it can finish on Code Capsules (avoids timeout/OOM)
  productionBrowserSourceMaps: false,
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  experimental: {
    optimizePackageImports: ['googleapis', '@anthropic-ai/sdk'],
  },
};

module.exports = nextConfig;
