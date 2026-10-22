import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site'; // adjust import path to your site config

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig?.url || process.env.NEXT_PUBLIC_SITE_URL || 'https://novatip.me';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/dashboard/*', '/onboarding', '/onboarding/*'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}