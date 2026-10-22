/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Every <Image> in the app passes `unoptimized`, so /_next/image is never
    // called by the pages themselves. remotePatterns still gates direct requests
    // to that endpoint, so the list is kept tight to prevent it acting as an
    // open proxy for arbitrary remote images.
    remotePatterns: [
      // Novatip's own CDN and subdomain assets.
      { protocol: "https", hostname: "**.novatip.xyz" },
    ],
  },
};

export default nextConfig;
