"use client";

/**
 * app/dashboard/qr/page.tsx
 *
 * Dashboard page showing the creator's QR code + share link.
 */

import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { authApi } from "@/lib/api";
import { QRDownload } from "@/components/QRDownload";
import { config } from "@/lib/config";

export default function QRPage() {
  const { jwt }  = useWallet();
  const [slug,   setSlug]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jwt) return;
    authApi
      .me(jwt)
      .then((r) => setSlug(r.user.slug))
      .catch(() => setSlug(null))
      .finally(() => setLoading(false));
  }, [jwt]);

  const pngUrl = slug
    ? `${config.apiUrl.replace("/api/v1", "")}/api/v1/qr/${slug}/png`
    : "";

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-md">
      <div>
        <h1 className="text-2xl font-bold text-white">QR Code & Link</h1>
        <p className="text-sm text-gray-400 mt-1">
          Share or print your QR code so anyone can tap to tip you instantly.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-52 w-52 rounded-2xl bg-white/10" />
          <div className="h-10 w-64 rounded-xl bg-white/10" />
        </div>
      )}

      {!loading && slug && (
        <QRDownload slug={slug} pngUrl={pngUrl} />
      )}

      {!loading && !slug && (
        <p className="text-sm text-gray-500">
          Complete onboarding to generate your QR code.
        </p>
      )}
    </div>
  );
}
