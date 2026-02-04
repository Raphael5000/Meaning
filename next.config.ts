import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use this project as the root (avoids "multiple lockfiles" warning when one exists in a parent dir)
  turbopack: { root: process.cwd() },
};

export default nextConfig;
