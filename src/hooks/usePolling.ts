"use client";

/**
 * hooks/usePolling.ts
 *
 * Visibility-aware polling for timed dashboard refreshes.
 *
 *   visible ──every intervalMs──▶ callback()
 *   hidden  ──────────────────▶ timer stopped, onHidden() (e.g. abort in-flight)
 *   visible again ────────────▶ callback() immediately, timer restarted
 *
 * A dashboard left open in a background tab would otherwise keep hitting the
 * backend forever. Returning to the tab refreshes straight away, so the data
 * on screen is current rather than up to one interval stale.
 *
 * callback runs immediately on mount and whenever its identity changes (e.g.
 * new credentials), but not when only intervalMs changes — callers that want a
 * fetch alongside an interval switch make it themselves. Keep callback stable
 * with useCallback, or it will fire on every render.
 */

import { useEffect, useRef } from "react";

interface UsePollingOptions {
  /** Called when the tab is hidden and polling pauses. */
  onHidden?: () => void;
}

function isHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

export function usePolling(
  callback: () => void,
  intervalMs: number,
  { onHidden }: UsePollingOptions = {},
): void {
  const callbackRef = useRef(callback);
  const onHiddenRef = useRef(onHidden);
  callbackRef.current = callback;
  onHiddenRef.current = onHidden;

  // Immediate run on mount and when the callback itself changes.
  useEffect(() => {
    if (!isHidden()) callback();
  }, [callback]);

  // Interval, paused while the tab is hidden.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(() => callbackRef.current(), intervalMs);
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };

    const onVisibilityChange = () => {
      if (isHidden()) {
        stop();
        onHiddenRef.current?.();
      } else {
        callbackRef.current();
        start();
      }
    };

    if (!isHidden()) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs]);
}
