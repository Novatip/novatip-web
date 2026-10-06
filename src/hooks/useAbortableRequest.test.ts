/**
 * src/hooks/useAbortableRequest.test.ts
 *
 * Unit tests for useAbortableRequest.
 *
 * Covers:
 *   - Starts loading and holds the initial data until a request resolves
 *   - A successful run replaces data, clears any previous error, and stops loading
 *   - A failed run surfaces the error message and stops loading
 *   - Starting a new run aborts the previous request's signal
 *   - An error whose code is "ABORTED" is swallowed rather than surfaced
 *   - abort() cancels the in-flight signal without starting a new request
 *   - The in-flight request is aborted automatically on unmount
 *   - A stale request resolving after a newer one started does not clobber state
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAbortableRequest } from "./useAbortableRequest";
import { ApiError } from "@/lib/api";

describe("useAbortableRequest", () => {
  it("starts loading with the initial data", () => {
    const { result } = renderHook(() => useAbortableRequest<string[]>([]));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("replaces data and stops loading on a successful run", async () => {
    const { result } = renderHook(() => useAbortableRequest<string[]>([]));

    act(() => {
      result.current.run(async () => ["a", "b"]);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(["a", "b"]);
    expect(result.current.error).toBeNull();
  });

  it("surfaces the error message and stops loading on a failed run", async () => {
    const { result } = renderHook(() => useAbortableRequest<string[]>([]));

    act(() => {
      result.current.run(async () => {
        throw new Error("network down");
      });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("network down");
    // Data from a failed run is left untouched.
    expect(result.current.data).toEqual([]);
  });

  it("clears a previous error once a later run succeeds", async () => {
    const { result } = renderHook(() => useAbortableRequest<string[]>([]));

    act(() => {
      result.current.run(async () => {
        throw new Error("first failure");
      });
    });
    await waitFor(() => expect(result.current.error).toBe("first failure"));

    act(() => {
      result.current.run(async () => ["ok"]);
    });
    await waitFor(() => expect(result.current.data).toEqual(["ok"]));
    expect(result.current.error).toBeNull();
  });

  it("aborts the previous request's signal when a new run starts", async () => {
    const { result } = renderHook(() => useAbortableRequest<string | null>(null));
    let firstSignal: AbortSignal | undefined;

    act(() => {
      result.current.run(
        (signal) =>
          new Promise((resolve) => {
            firstSignal = signal;
            // Never resolves on its own — only the abort should end it.
          }),
      );
    });

    act(() => {
      result.current.run(async () => "second");
    });

    expect(firstSignal?.aborted).toBe(true);
    await waitFor(() => expect(result.current.data).toBe("second"));
  });

  it("swallows an ABORTED error instead of surfacing it", async () => {
    const { result } = renderHook(() => useAbortableRequest<string[]>([]));

    act(() => {
      result.current.run(async () => {
        // A real ApiError, not a plain Error carrying a `code`: the hook
        // narrows with `instanceof ApiError` rather than duck-typing, so a
        // look-alike is correctly treated as a genuine failure.
        throw new ApiError(0, "ABORTED", "Request aborted");
      });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual([]);
  });

  it("abort() cancels the in-flight signal without starting a new request", () => {
    const { result } = renderHook(() => useAbortableRequest<string | null>(null));
    let signal: AbortSignal | undefined;

    act(() => {
      result.current.run(
        (s) =>
          new Promise(() => {
            signal = s;
          }),
      );
    });

    act(() => {
      result.current.abort();
    });

    expect(signal?.aborted).toBe(true);
  });

  it("aborts the in-flight request on unmount", () => {
    const { result, unmount } = renderHook(() => useAbortableRequest<string | null>(null));
    let signal: AbortSignal | undefined;

    act(() => {
      result.current.run(
        (s) =>
          new Promise(() => {
            signal = s;
          }),
      );
    });

    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("ignores a stale request that resolves after a newer one has already started", async () => {
    const { result } = renderHook(() => useAbortableRequest<string | null>(null));

    let resolveFirst: (value: string) => void = () => {};
    const first = new Promise<string>((resolve) => { resolveFirst = resolve; });

    act(() => {
      // The fetcher itself doesn't check its signal — this proves the hook's
      // own staleness guard (not merely relying on the fetcher's aborted
      // rejection) keeps a late resolution from clobbering newer state.
      result.current.run(() => first);
    });

    act(() => {
      result.current.run(async () => "second");
    });
    await waitFor(() => expect(result.current.data).toBe("second"));

    act(() => {
      resolveFirst("stale");
    });

    // Give the resolved-but-stale promise a tick to (not) apply its result.
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.data).toBe("second");
  });
});
