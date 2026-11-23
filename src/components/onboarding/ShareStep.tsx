"use client";

/**
 * onboarding/ShareStep.tsx
 * Step 3 — share your link and download QR code.
 */

import { QRDownload } from "@/components/QRDownload";
import { LinkButton } from "@/components/ui/LinkButton";
import { getQrPngUrl } from "@/lib/tipUrl";

interface ShareStepProps {
  slug: string;
}

export function ShareStep({ slug }: ShareStepProps) {
  const pngUrl = getQrPngUrl(slug);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-fg mb-1">You&rsquo;re live! 🎉</h2>
        <p className="text-sm text-fg-subtle">
          Share your link or QR code to start receiving tips.
        </p>
      </div>

      <QRDownload slug={slug} pngUrl={pngUrl} />

      <LinkButton href="/dashboard" size="lg" className="w-full max-w-xs">
        Go to dashboard →
      </LinkButton>
    </div>
  );
}
