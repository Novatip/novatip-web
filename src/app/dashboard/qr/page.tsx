"use client";

/**
 * app/dashboard/qr/page.tsx
 *
 * Dashboard page showing the creator's QR code + share link.
 */

import { useCreator } from "@/contexts/CreatorContext";
import { QRDownload } from "@/components/QRDownload";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { getQrPngUrl } from "@/lib/tipUrl";

export default function QRPage() {
  const { creator, loading, error, refresh: fetchSlug } = useCreator();
  const slug = creator?.slug ?? null;

  const pngUrl = slug ? getQrPngUrl(slug) : "";

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-md">
      <div>
        <h1 className="text-2xl font-bold text-fg">QR Code &amp; Link</h1>
        <p className="text-sm text-fg-subtle mt-1">
          Share or print your QR code so anyone can tap to tip you instantly.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-52 w-52 rounded-2xl bg-hairline" />
          <div className="h-10 w-64 rounded-xl bg-hairline" />
        </div>
      )}

      {/* A failed lookup is shown as an error, distinct from simply having no slug yet. */}
      {!loading && error && (
        <ErrorPanel message={`Failed to load your QR code: ${error}`} onRetry={fetchSlug} />
      )}

      {!loading && !error && slug && (
        <QRDownload slug={slug} pngUrl={pngUrl} className="printable-qr-card" />
      )}

      {!loading && !error && !slug && (
        <p className="text-sm text-fg-faint">Complete onboarding to generate your QR code.</p>
      )}
    </div>
  );
}
