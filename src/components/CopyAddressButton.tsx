"use client";

/**
 * CopyAddressButton.tsx
 *
 * Small icon button that copies a full address to the clipboard. Shows the
 * copied (✓) and failed (✕) states and carries the matching aria-labels.
 * Shared by every list that shows a shortened address.
 */

import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

interface CopyAddressButtonProps {
  /** The full address to copy. */
  address: string;
}

export function CopyAddressButton({ address }: CopyAddressButtonProps) {
  const { copied, failed, copy } = useCopyToClipboard();

  return (
    <button
      type="button"
      onClick={() => void copy(address)}
      className={cn(
        "shrink-0 rounded-md p-1 text-xs transition-colors",
        "hover:bg-hairline focus:outline-none focus:ring-2 focus:ring-brand-500/50",
        failed ? "text-danger" : copied ? "text-success" : "text-fg-faint hover:text-fg",
      )}
      aria-label={
        copied
          ? "Full address copied"
          : failed
            ? "Couldn't copy address — try again"
            : `Copy full address ${address}`
      }
    >
      {copied ? "✓" : failed ? "✕" : "📋"}
    </button>
  );
}
