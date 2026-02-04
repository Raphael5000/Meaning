/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use this project as the root (avoids "multiple lockfiles" warning when one exists in a parent dir)
  turbopack: { root: process.cwd() },
};

module.exports = nextConfig;
