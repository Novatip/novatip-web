import { MetadataRoute } from 'next';
import { config } from '@/lib/config';

// Static public routes only. Creator tip pages (/[slug]) are dynamic and not
// listed client-side; /dashboard and /onboarding are disallowed in robots.ts.
const PUBLIC_ROUTES = ['/'];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = config.siteUrl.replace(/\/$/, '');

  return PUBLIC_ROUTES.map((route) => ({
    url: route === '/' ? baseUrl : `${baseUrl}${route}`,
  }));
}
