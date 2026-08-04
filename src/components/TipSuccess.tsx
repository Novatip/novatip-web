"use client";

/**
 * TipSuccess.tsx
 *
 * Shown after a tip is confirmed on-chain.
 * Fires a confetti burst and gives the user share + reset options.
 */

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface TipSuccessProps {
  amount:   string;
  slug:     string;
  onReset:  () => void;
}

export function TipSuccess({ amount, slug, onReset }: TipSuccessProps) {
  const firedRef = useRef(false);

  // Fire confetti once on mount
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    void confetti({
      particleCount: 120,
      spread:        80,
      origin:        { y: 0.55 },
      // No pure white — it disappears against the light theme's canvas.
      colors:        ["#38bdf8", "#0ea5e9", "#7dd3fc", "#22d3ee", "#2775ca"],
    });

    // Second burst after a short delay for extra flair
    const timer = setTimeout(() => {
      void confetti({
        particleCount: 60,
        spread:        120,
        origin:        { y: 0.5 },
        scalar:        0.8,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const shareText = `I just tipped @${slug} $${amount} USDC on Novatip! 💸`;
  const shareUrl  = typeof window !== "undefined"
    ? `${window.location.origin}/${slug}`
    : `https://novatip.xyz/${slug}`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Novatip", text: shareText, url: shareUrl });
      } catch {
        // User cancelled share — ignore
      }
    } else {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    }
  }

  return (
    <Card className="text-center animate-slide-up">
      <div className="flex flex-col items-center gap-5 py-4">

        {/* Success icon */}
        <div
          className={cn(
            "flex items-center justify-center",
            "h-20 w-20 rounded-full",
            "bg-success/15 ring-4 ring-success/20",
          )}
          role="img"
          aria-label="Success"
        >
          <span className="text-4xl">💸</span>
        </div>

        {/* Headline */}
        <div>
          <h2 className="text-2xl font-bold text-fg mb-1">
            Tip sent!
          </h2>
          <p className="text-fg-subtle text-sm">
            Your{" "}
            <span className="text-accent font-semibold">${amount} USDC</span>{" "}
            tip landed in{" "}
            <span className="text-fg font-medium">@{slug}</span>'s jar.
          </p>
        </div>

        {/* On-chain note */}
        <div className="w-full rounded-xl bg-success/10 border border-success/20 px-4 py-3">
          <p className="text-xs text-success flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
            Settled on Stellar — no middlemen, no platform fees
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col w-full gap-3">
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={handleShare}
            aria-label="Share this tip"
          >
            Share 🔗
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={onReset}
            aria-label="Send another tip"
          >
            Send another tip
          </Button>
        </div>

      </div>
    </Card>
  );
}
