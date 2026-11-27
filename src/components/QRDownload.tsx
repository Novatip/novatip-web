"use client";

/**
 * QRDownload.tsx
 *
 * Renders a live QR code preview (via qrcode.react) and provides
 * buttons to download the PNG from the backend or copy the tip URL.
 *
 * Used on both the public tip page and the dashboard QR page.
 */

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { CopyFallback } from "@/components/CopyFallback";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { getTipUrl } from "@/lib/tipUrl";
import { cn } from "@/lib/utils";

const QR_DOWNLOAD_TIMEOUT_MS = 15000;

interface QRDownloadProps {
  slug: string;
  pngUrl: string;
  className?: string;
}

export function QRDownload({ slug, pngUrl, className }: QRDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { copied, failed, copy, reset } = useCopyToClipboard();
  const abortControllerRef = useRef<AbortController | null>(null);

  const tipUrl = getTipUrl(slug);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ── Copy link ──────────────────────────────────────────────────────────────
  // A failure surfaces as the CopyFallback below rather than doing nothing —
  // sharing this link is the whole point of the page, so a silent no-op would
  // leave the user believing they had it when they did not.
  async function handleCopy() {
    await copy(tipUrl);
  }

  // ── Download PNG ───────────────────────────────────────────────────────────
  async function handleDownload() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setDownloading(true);
    setDownloadError(null);

    const timeoutId = setTimeout(() => abortController.abort(), QR_DOWNLOAD_TIMEOUT_MS);

    try {
      const res = await fetch(pngUrl, { signal: abortController.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        setDownloadError("Couldn\u2019t fetch the QR code. Please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `novatip-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      if (abortController.signal.aborted) {
        return;
      }
      setDownloadError("Couldn\u2019t fetch the QR code. Please try again.");
    } finally {
      if (!abortController.signal.aborted) {
        setDownloading(false);
      }
      abortControllerRef.current = null;
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* QR preview — always on white so scanners keep their contrast */}
      <div className="rounded-2xl bg-white p-4 shadow-xl shadow-black/10 dark:shadow-black/30">
        <QRCodeSVG
          value={tipUrl}
          size={180}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
          includeMargin={false}
          title={`QR code for @${slug} tip page`}
        />
      </div>

      {/* Tip URL display */}
      <div className="flex items-center gap-2 rounded-xl bg-surface-strong border border-hairline px-4 py-2.5 w-full max-w-xs">
        <span className="flex-1 text-xs text-fg-subtle font-mono truncate">{tipUrl}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "no-print text-xs transition-colors shrink-0 font-medium",
            failed ? "text-danger hover:text-danger" : "text-accent hover:text-accent-strong",
          )}
          aria-label="Copy tip URL"
        >
          {failed ? "Failed" : copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Manual escape hatch when the browser refuses the clipboard */}
      {failed && (
        <CopyFallback text={tipUrl} onDismiss={reset} noun="tip link" className="no-print max-w-xs" />
      )}

      {/* Action buttons */}
      <div className="no-print w-full max-w-xs">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          loading={downloading}
          onClick={handleDownload}
          aria-label="Download QR code as PNG"
        >
          Download PNG
        </Button>
      </div>

      {downloadError && <p className="no-print text-xs text-danger text-center">{downloadError}</p>}

      <p className="text-xs text-fg-faint text-center">
        Print or share your QR code so anyone can tap to tip you
      </p>
    </div>
  );
}
