/**
 * lib/homeOgCard.tsx
 *
 * The preview card for the home page, shared by app/opengraph-image.tsx and
 * app/twitter-image.tsx so the two can never drift apart. Each of those files
 * still declares its own `runtime`, `alt`, `size` and `contentType`: Next reads
 * route segment config statically from the file, so it cannot be re-exported
 * from here.
 *
 * Rendered by Satori, which imposes two rules on every element below (see
 * CONTRIBUTING.md for the long version):
 *   1. A div with more than one child must set `display: "flex"` in its
 *      style, or Satori throws.
 *   2. A child that mixes literal text with an interpolated expression is two
 *      child nodes, not one — write it as a single template literal instead.
 * Breaking either rule fails the render outright rather than degrading, so
 * the home page would unfurl with no preview at all.
 */

import { ImageResponse } from "next/og";
import { config } from "@/lib/config";

export const HOME_OG_SIZE = { width: 1200, height: 630 } as const;

export function renderHomeOgCard(): ImageResponse {
  const siteHost = new URL(config.siteUrl).host;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily: "sans-serif",
        padding: "60px",
      }}
    >
      {/* Emoji icon */}
      <div style={{ fontSize: 96, marginBottom: 24 }}>💸</div>

      {/* Product name */}
      <div
        style={{
          fontSize: 40,
          fontWeight: 700,
          color: "#38bdf8",
          marginBottom: 20,
        }}
      >
        Novatip
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: 68,
          fontWeight: 800,
          color: "#ffffff",
          textAlign: "center",
          lineHeight: 1.15,
          maxWidth: 960,
          marginBottom: 20,
        }}
      >
        Tip any creator in 2 seconds
      </div>

      {/* Subline */}
      <div
        style={{
          fontSize: 28,
          color: "#94a3b8",
          textAlign: "center",
          maxWidth: 800,
          lineHeight: 1.4,
          marginBottom: 40,
        }}
      >
        Cross-border micro-tipping for creators, streamers and street musicians.
      </div>

      {/* CTA badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(14, 165, 233, 0.15)",
          border: "1px solid rgba(14, 165, 233, 0.4)",
          borderRadius: "999px",
          padding: "12px 28px",
        }}
      >
        <div style={{ fontSize: 22, color: "#38bdf8" }}>Tip with USDC on Stellar</div>
      </div>

      {/* Site host */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 60,
          fontSize: 20,
          color: "#475569",
        }}
      >
        {siteHost}
      </div>
    </div>,
    { ...HOME_OG_SIZE },
  );
}
