/**
 * app/opengraph-image.tsx
 *
 * Open Graph image for the home page (/). Without it, a link to the home page
 * pasted into Twitter, WhatsApp or Discord unfurls with no preview.
 *
 * A Next file convention: it serves a 1200 by 630 PNG at /opengraph-image and
 * injects the absolute URL into the root openGraph metadata automatically, so
 * app/layout.tsx deliberately sets no `images` by hand (see the note in
 * app/[slug]/page.tsx for what hand-written URLs cost us). Creator pages keep
 * their own card from app/[slug]/opengraph-image.tsx.
 *
 * The card itself lives in lib/homeOgCard.tsx and follows the Satori rules in
 * CONTRIBUTING.md; app/twitter-image.tsx renders the same card.
 */

import { renderHomeOgCard } from "@/lib/homeOgCard";

export const runtime = "edge";
export const alt = "Novatip — Tap to tip any creator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return renderHomeOgCard();
}
