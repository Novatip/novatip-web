/**
 * lib/tipUrl.ts
 *
 * Single source of truth for a creator's public tip page URL, so the
 * onboarding preview, share step, and QR download can't drift apart again.
 */

import { config } from "./config";

export function getTipUrl(slug: string): string {
  const origin = typeof window !== "undefined"
    ? window.location.origin
    : config.siteUrl.replace(/\/$/, "");
  return `${origin}/${slug}`;
}
