"use client";

/**
 * hooks/useCopyToClipboard.ts
 *
 * Shared copy-to-clipboard state for every "Copy link" affordance in the app.
 *
 * Wraps lib/clipboard's copyText() with the little state machine each caller
 * would otherwise reimplement:
 *
 *   idle ──copy() ok──▶ copied ──after resetDelay──▶ idle
 *     └────copy() fail─▶ error  ──reset()──────────▶ idle
 *
 * The success state clears itself so the button goes back to "Copy", but the
 * error state is sticky on purpose: it is what reveals the manual-copy
 * fallback, and yanking that away after two seconds would strand the user
 * exactly when the clipboard already let them down.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/clipboard";

export type CopyStatus = "idle" | "copied" | "error";

/** How long the "Copied!" confirmation stays up, in milliseconds. */
export const COPIED_RESET_DELAY = 2000;

export interface UseCopyToClipboard {
  /** Current state of the last copy attempt. */
  status: CopyStatus;
  /** Convenience flags so callers do not compare strings inline. */
  copied: boolean;
  failed: boolean;
  /** Attempt the copy; resolves true when the text reached the clipboard. */
  copy: (text: string) => Promise<boolean>;
  /** Drop back to idle — e.g. when the user dismisses the fallback. */
  reset: () => void;
}

export function useCopyToClipboard(
  resetDelay: number = COPIED_RESET_DELAY,
): UseCopyToClipboard {
  const [status, setStatus] = useState<CopyStatus>("idle");

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against setting state after unmount — copy() is async, and the user
  // can navigate away between the click and the clipboard write resolving.
  const mountedRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Set on mount as well as cleared on unmount, so StrictMode's double
    // invoke in development does not leave the ref stuck at false.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setStatus("idle");
  }, [clearTimer]);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // A fresh attempt supersedes whatever the last one was showing.
      clearTimer();

      const ok = await copyText(text);
      if (!mountedRef.current) return ok;

      setStatus(ok ? "copied" : "error");

      if (ok) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (mountedRef.current) setStatus("idle");
        }, resetDelay);
      }

      return ok;
    },
    [clearTimer, resetDelay],
  );

  return {
    status,
    copied: status === "copied",
    failed: status === "error",
    copy,
    reset,
  };
}
