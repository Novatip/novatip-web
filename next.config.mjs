/**
 * Security headers sent on every route.
 *
 * The tip page handles a wallet connection and keeps a session token in
 * localStorage, so other sites must not be able to frame it. A full
 * Content-Security-Policy is intentionally left for a later change.
 */
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
