/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Novatip's own CDN and subdomain assets.
      { protocol: "https", hostname: "**.novatip.xyz" },
      // Default identicon avatars.
      { protocol: "https", hostname: "api.dicebear.com" },
      // The backend accepts any https:// URL for avatarUrl, so the frontend
      // must be equally permissive. A mismatch means a valid backend save
      // produces a broken page when next/image refuses to render the URL.
      // Restrict to https to keep the allow-list safe.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
