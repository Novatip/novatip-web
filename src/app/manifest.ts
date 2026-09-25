import type { MetadataRoute } from "next";

/**
 * app/manifest.ts
 *
 * Next's special-file convention: this is auto-served at /manifest.webmanifest
 * and auto-linked from <head>, so nothing in layout.tsx needs to reference it.
 * Lets the tip page be added to a phone's home screen and open without
 * browser chrome — the common case is a supporter opening a scanned QR code.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Novatip — Tap to tip any creator",
    short_name:       "Novatip",
    description:      "Cross-border micro-tipping for creators, streamers, and street musicians. Powered by Stellar.",
    start_url:        "/",
    display:          "standalone",
    background_color: "#f8fafc",
    theme_color:      "#f8fafc",
    icons: [
      {
        src:     "/logo.svg",
        sizes:   "any",
        type:    "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
