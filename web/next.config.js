/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Enable standalone output for Docker optimization
  output: 'standalone',
  // Compress responses
  compress: true,
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
};

module.exports = nextConfig;
