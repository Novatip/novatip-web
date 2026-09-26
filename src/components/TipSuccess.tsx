"use client";

/**
 * TipSuccess.tsx
 *
 * Shown after a tip is confirmed on-chain.
 * Fires a confetti burst and gives the user share + reset options.
 */

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyFallback } from "@/components/CopyFallback";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";
import { getTipUrl } from "@/lib/tipUrl";

interface TipSuccessProps {
  amount:   string;
  slug:     string;
  onReset:  () => void;
}

/** A share the user backed out of — not something to report as a failure. */
function isUserCancellation(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === "AbortError";
}

/**
 * Whether this browser can open the native share sheet for `data`.
 *
 * navigator.share is secure-context only and absent on most desktops;
 * canShare, where present, also rules out payloads the platform won't take.
 */
function canNativeShare(data: ShareData): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  return typeof navigator.canShare !== "function" || navigator.canShare(data);
}

export function TipSuccess({ amount, slug, onReset }: TipSuccessProps) {
  const firedRef = useRef(false);
  const { copied, failed, copy, reset } = useCopyToClipboard();

  const successRef = useRef<HTMLDivElement>(null);

  // Fire confetti once on mount and move focus for screen readers
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    // Move focus to the success content so screen reader users
    // hear the announcement and tab lands somewhere sensible.
    successRef.current?.focus();

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

  const shareText    = `I just tipped @${slug} $${amount} USDC on Novatip! 💸`;
  const shareUrl     = getTipUrl(slug);
  const shareMessage = `${shareText} ${shareUrl}`;
  const shareData: ShareData = { title: `Tip @${slug} on Novatip`, text: shareText, url: shareUrl };

  // Detected after mount, not during render: the server has no navigator, and
  // guessing there would render a different button than the client hydrates.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(canNativeShare(shareData));
    // shareData is rebuilt every render; its inputs are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, amount]);

  /**
   * Native share sheet when there is one, clipboard otherwise.
   *
   * Both of those can be missing — navigator.share and navigator.clipboard are
   * secure-context only — so the copy result is surfaced either way instead of
   * leaving the button looking inert.
   */
  async function handleShare() {
    if (canShare) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        // Backing out of the sheet is a decision, not a problem — say nothing.
        if (isUserCancellation(error)) return;
        // Anything else means the share never happened, so fall through and
        // give the user the clipboard rather than nothing at all.
      }
    }

    await copy(shareMessage);
  }

  return (
    <Card className="text-center animate-slide-up" ref={successRef} tabIndex={-1} role="status" aria-live="polite">
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
            <span className="text-fg font-medium">@{slug}</span>&rsquo;s jar.
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
          {canShare ? (
            <>
              {/* The share sheet is one tap to whichever app the supporter
                  uses, so on phones it leads; copy stays for everything else. */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleShare}
                aria-label={`Share @${slug}'s tip page`}
              >
                Share @{slug}
              </Button>
              <Button
                size="lg"
                variant={failed ? "danger" : "secondary"}
                className="w-full"
                onClick={() => copy(shareMessage)}
                aria-label="Copy link to clipboard"
              >
                {failed ? "Couldn't copy" : copied ? "✓ Link copied" : "Copy link"}
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              variant={failed ? "danger" : "secondary"}
              className="w-full"
              onClick={handleShare}
              aria-label="Copy link to clipboard"
            >
              {failed ? "Couldn't copy" : copied ? "✓ Link copied" : "Copy link 🔗"}
            </Button>
          )}

          {failed && (
            <CopyFallback text={shareMessage} onDismiss={reset} noun="message" />
          )}

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
