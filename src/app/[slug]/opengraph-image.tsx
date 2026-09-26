/**
 * app/[slug]/opengraph-image.tsx
 *
 * Generates a dynamic Open Graph image for each creator tip page.
 * When a creator shares their tip link on Twitter, WhatsApp, or any
 * platform that reads OG tags, this image is shown in the preview card.
 *
 * Uses Next.js ImageResponse (built on Vercel OG) - no external deps needed.
 */

import { ImageResponse } from "next/og";
import { resolverApi } from "@/lib/api";
import { config } from "@/lib/config";

export const runtime = "edge";
export const alt     = "Tip this creator on Novatip";
export const size    = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  // Next 15 resolves route params asynchronously, so this is a Promise.
  params: Promise<{ slug: string }>;
}

export default async function OgImage({ params }: Props) {
  const slug = decodeURIComponent((await params).slug).replace(/^@/, "");

  const siteHost   = new URL(config.siteUrl).host;
  let displayName = `@${slug}`;
  let bio         = "Send a USDC tip in seconds on Stellar.";

  try {
    const { creator } = await resolverApi.resolve(slug);
    displayName = creator.displayName ?? `@${slug}`;
    bio         = creator.bio ?? bio;
  } catch {
    // Fall back to defaults if the creator cannot be resolved
  }

  return new ImageResponse(
    (
      <div
        style={{
          width:           "100%",
          height:          "100%",
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          background:      "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          fontFamily:      "sans-serif",
          padding:         "60px",
        }}
      >
        {/* Emoji icon */}
        <div style={{ fontSize: 80, marginBottom: 24 }}>💸</div>

        {/* Creator name */}
        <div
          style={{
            fontSize:   56,
            fontWeight: 800,
            color:      "#ffffff",
            textAlign:  "center",
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          {displayName}
        </div>

        {/* Slug */}
        <div
          style={{
            fontSize:  28,
            color:     "#38bdf8",
            fontFamily: "monospace",
            marginBottom: 24,
          }}
        >
          {/* One interpolation, not `@{slug}`: that is two child nodes, and
              Satori refuses any div with multiple children unless it declares
              display:flex. It threw on every render, so no preview image was
              ever produced. */}
          {`@${slug}`}
        </div>

        {/* Bio */}
        {bio && (
          <div
            style={{
              fontSize:    24,
              color:       "#94a3b8",
              textAlign:   "center",
              maxWidth:    700,
              lineHeight:  1.5,
              marginBottom: 40,
            }}
          >
            {bio.length > 100 ? `${bio.slice(0, 100)}...` : bio}
          </div>
        )}

        {/* CTA badge */}
        <div
          style={{
            display:         "flex",
            alignItems:      "center",
            gap:             12,
            background:      "rgba(14, 165, 233, 0.15)",
            border:          "1px solid rgba(14, 165, 233, 0.4)",
            borderRadius:    "999px",
            padding:         "12px 28px",
          }}
        >
          <div style={{ fontSize: 20, color: "#38bdf8" }}>
            Tip with USDC on Stellar
          </div>
        </div>

        {/* Novatip branding */}
        <div
          style={{
            position:  "absolute",
            bottom:    40,
            right:     60,
            fontSize:  20,
            color:     "#475569",
          }}
        >
          {siteHost}
        </div>
      </div>
    ),
    { ...size },
  );
}
