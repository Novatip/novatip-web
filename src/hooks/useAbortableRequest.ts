"use client";

/**
 * hooks/useAbortableRequest.ts
 *
 * Shared request lifecycle for a component-owned data fetch: aborts any
 * request already in flight before starting a new one, ignores the abort
 * error that produces, and tracks loading/error/data state around it.
 * Also aborts on unmount so no state update lands after the component is
 * gone.
 *
 * Callers stay in control of *when* to fetch (on mount, on a dependency
 * change, on a poll tick, in response to an event) by calling `run` with a
 * fetcher — this hook only owns what every one of those call sites used to
 * duplicate around it.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

export interface UseAbortableRequestResult<T> {
  data:    T;
  loading: boolean;
  error:   string | null;
  /** Abort any in-flight request and start a new one, replacing `data` on success. */
  run:     (fetcher: (signal: AbortSignal) => Promise<T>) => void;
  /** Abort any in-flight request without starting a new one. */
  abort:   () => void;
}

export function useAbortableRequest<T>(initialData: T): UseAbortableRequestResult<T> {
  const [data,    setData]    = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const run = useCallback((fetcher: (signal: AbortSignal) => Promise<T>) => {
    abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    fetcher(controller.signal)
      .then((result) => {
        // A later run() may have replaced this controller while this one was
        // still in flight — a stale resolution must not overwrite newer state.
        if (abortControllerRef.current !== controller) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => {
        if (abortControllerRef.current !== controller) return;
        if (e instanceof ApiError && e.code === "ABORTED") return;
        setError(e instanceof Error ? e.message : "Something went wrong.");
      })
      .finally(() => {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setLoading(false);
        }
      });
  }, [abort]);

  useEffect(() => abort, [abort]);

  return { data, loading, error, run, abort };
}
