/**
 * lib/tipUrl.ts
 *
 * Single source of truth for a creator's public tip page URL, so the
 * onboarding preview, share step, and QR download can't drift apart again.
 */

import { config, DEFAULT_SITE_URL } from "./config";

export function getTipUrl(slug: string): string {
  // On the server, always use config.siteUrl
  if (typeof window === "undefined") {
    return `${config.siteUrl.replace(/\/$/, "")}/${encodeURIComponent(slug)}`;
  }

  // On the client, prefer the explicitly configured site URL over the browser origin.
  // Only fall back to window.location.origin when NEXT_PUBLIC_SITE_URL was not set,
  // so deployments that never configured it don't break, but production deployments
  // with an explicit site URL use that value instead of preview/alias origins.
  const origin =
    config.siteUrl !== DEFAULT_SITE_URL
      ? config.siteUrl.replace(/\/$/, "")
      : window.location.origin;

  return `${origin}/${encodeURIComponent(slug)}`;
}

export function getQrPngUrl(slug: string): string {
  return `${config.apiUrl}/qr/${encodeURIComponent(slug)}/png`;
}
