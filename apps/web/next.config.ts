import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: process.env.NODE_ENV === 'production',
  // Không phát sinh browser sourcemap ở bản production (đã là mặc định của Next.js —
  // ghi rõ để chắc chắn source code không bao giờ lộ qua .map trên prod). Dev vẫn có
  // sourcemap để Fast Refresh/debug hoạt động.
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
