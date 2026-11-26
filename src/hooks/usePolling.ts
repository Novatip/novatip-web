"use client";

/**
 * hooks/usePolling.ts
 *
 * Visibility-aware and connectivity-aware polling for timed dashboard refreshes.
 *
 *   visible + online ──every intervalMs──▶ callback()
 *   hidden ───────────────────────────▶ timer stopped, onHidden() (e.g. abort in-flight)
 *   offline ──────────────────────────▶ timer stopped
 *   visible again ────────────────────▶ callback() immediately, timer restarted
 *   online again ─────────────────────▶ callback() immediately, timer restarted
 *
 * A dashboard left open in a background tab would otherwise keep hitting the
 * backend forever. Returning to the tab refreshes straight away, so the data
 * on screen is current rather than up to one interval stale.
 *
 * While offline, polling stops to avoid failed requests and connection banners.
 * Coming back online triggers an immediate refresh and resumes polling.
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

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
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
    if (!isHidden() && !isOffline()) callback();
  }, [callback]);

  // Interval, paused while the tab is hidden or offline.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null && !isHidden() && !isOffline()) {
        timer = setInterval(() => callbackRef.current(), intervalMs);
      }
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };

    const onVisibilityChange = () => {
      if (isHidden()) {
        stop();
        onHiddenRef.current?.();
      } else if (!isOffline()) {
        callbackRef.current();
        start();
      }
    };

    const onOffline = () => {
      stop();
    };

    const onOnline = () => {
      if (!isHidden()) {
        callbackRef.current();
        start();
      }
    };

    if (!isHidden() && !isOffline()) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [intervalMs]);
}
