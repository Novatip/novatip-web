"use client";

/**
 * QRDownload.tsx
 *
 * Renders a live QR code preview (via qrcode.react) and provides
 * buttons to download the PNG from the backend or copy the tip URL.
 *
 * Used on both the public tip page and the dashboard QR page.
 */

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface QRDownloadProps {
  slug:       string;
  pngUrl:     string;
  className?: string;
}

export function QRDownload({ slug, pngUrl, className }: QRDownloadProps) {
  const [copied,      setCopied]      = useState(false);
  const [downloading, setDownloading] = useState(false);

  const tipUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${slug}`
    : `https://novatip.xyz/${slug}`;

  // ── Copy link ──────────────────────────────────────────────────────────────
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tipUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silent fail
    }
  }

  // ── Download PNG ───────────────────────────────────────────────────────────
  async function handleDownload() {
    setDownloading(true);
    try {
      const res  = await fetch(pngUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `novatip-${slug}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail — user can still right-click the QR image
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>

      {/* QR preview */}
      <div
        className="rounded-2xl bg-white p-4 shadow-xl shadow-black/30"
        aria-label={`QR code for @${slug} tip page`}
      >
        <QRCodeSVG
          value={tipUrl}
          size={180}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Tip URL display */}
      <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 w-full max-w-xs">
        <span className="flex-1 text-xs text-gray-400 font-mono truncate">
          {tipUrl}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors shrink-0 font-medium"
          aria-label="Copy tip URL"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 w-full max-w-xs">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          loading={downloading}
          onClick={handleDownload}
          aria-label="Download QR code as PNG"
        >
          Download PNG
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={handleCopy}
          aria-label="Copy tip link"
        >
          {copied ? "✓ Copied" : "Copy link"}
        </Button>
      </div>

      <p className="text-xs text-gray-600 text-center">
        Print or share your QR code so anyone can tap to tip you
      </p>
    </div>
  );
}
