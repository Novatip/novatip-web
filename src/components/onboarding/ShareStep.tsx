"use client";

/**
 * onboarding/ShareStep.tsx
 * Step 3 — share your link and download QR code.
 */

import Link from "next/link";
import { QRDownload } from "@/components/QRDownload";
import { Button } from "@/components/ui/Button";
import { config } from "@/lib/config";

interface ShareStepProps {
  slug: string;
}

export function ShareStep({ slug }: ShareStepProps) {
  const pngUrl = `${config.apiUrl.replace("/api/v1", "")}/api/v1/qr/${slug}/png`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-1">You're live! 🎉</h2>
        <p className="text-sm text-gray-400">
          Share your link or QR code to start receiving tips.
        </p>
      </div>

      <QRDownload slug={slug} pngUrl={pngUrl} />

      <Link href="/dashboard" className="w-full max-w-xs">
        <Button size="lg" className="w-full">
          Go to dashboard →
        </Button>
      </Link>
    </div>
  );
}
