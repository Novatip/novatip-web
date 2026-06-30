import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.novatip.xyz" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
