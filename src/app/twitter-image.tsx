/**
 * app/twitter-image.tsx
 *
 * Twitter card image for the home page (/). Same card as
 * app/opengraph-image.tsx, served at /twitter-image so the root `twitter`
 * metadata gets its own image URL injected. See lib/homeOgCard.tsx for the
 * card and the Satori rules it follows.
 */

import { renderHomeOgCard } from "@/lib/homeOgCard";

export const runtime     = "edge";
export const alt         = "Novatip — Tap to tip any creator";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return renderHomeOgCard();
}
