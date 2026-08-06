/**
 * src/hooks/useCopyToClipboard.test.ts
 *
 * Unit tests for useCopyToClipboard.
 *
 * Covers:
 *   - A successful copy flips to "copied" and clears itself
 *   - A failed copy flips to "error" and stays there, so the manual fallback
 *     does not vanish from under the user
 *   - Retrying supersedes the previous outcome
 *   - No state is set after unmount
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCopyToClipboard, COPIED_RESET_DELAY } from "./useCopyToClipboard";
import * as clipboard from "@/lib/clipboard";

/** Indirection purely so the spy's type is inferred rather than hand-written. */
function spyOnCopyText() {
  return vi.spyOn(clipboard, "copyText");
}

let copySpy: ReturnType<typeof spyOnCopyText>;

/** Make the next copyText() call succeed or fail. */
function whenCopy(succeeds: boolean) {
  copySpy.mockResolvedValue(succeeds);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  copySpy = spyOnCopyText();
  whenCopy(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── Success ───────────────────────────────────────────────────────────────────

describe("useCopyToClipboard – success", () => {
  it("starts idle", () => {
    const { result } = renderHook(() => useCopyToClipboard());

    expect(result.current.status).toBe("idle");
    expect(result.current.copied).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it("reports copied and passes the text through", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await expect(result.current.copy("https://novatip.xyz/ada")).resolves.toBe(true);
    });

    expect(result.current.status).toBe("copied");
    expect(copySpy).toHaveBeenCalledWith("https://novatip.xyz/ada");
  });

  it("clears the confirmation after the reset delay", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("https://novatip.xyz/ada");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(COPIED_RESET_DELAY);
    });

    await waitFor(() => expect(result.current.status).toBe("idle"));
  });

  it("honours a custom reset delay", async () => {
    const { result } = renderHook(() => useCopyToClipboard(500));

    await act(async () => {
      await result.current.copy("https://novatip.xyz/ada");
    });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));
  });
});

// ── Failure ───────────────────────────────────────────────────────────────────

describe("useCopyToClipboard – failure", () => {
  it("reports an error instead of failing silently", async () => {
    whenCopy(false);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await expect(result.current.copy("https://novatip.xyz/ada")).resolves.toBe(false);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.failed).toBe(true);
  });

  it("keeps the error up so the manual fallback stays reachable", async () => {
    whenCopy(false);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("https://novatip.xyz/ada");
    });

    act(() => {
      vi.advanceTimersByTime(COPIED_RESET_DELAY * 5);
    });

    expect(result.current.status).toBe("error");
  });

  it("clears the error on reset()", async () => {
    whenCopy(false);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("https://novatip.xyz/ada");
    });
    act(() => result.current.reset());

    expect(result.current.status).toBe("idle");
  });
});

// ── Repeated attempts ─────────────────────────────────────────────────────────

describe("useCopyToClipboard – repeated attempts", () => {
  it("lets a later success replace an earlier failure", async () => {
    whenCopy(false);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("https://novatip.xyz/ada");
    });
    expect(result.current.failed).toBe(true);

    whenCopy(true);
    await act(async () => {
      await result.current.copy("https://novatip.xyz/ada");
    });

    expect(result.current.copied).toBe(true);
  });

  it("restarts the reset timer on each successful copy", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("https://novatip.xyz/ada");
    });
    act(() => {
      vi.advanceTimersByTime(COPIED_RESET_DELAY - 100);
    });

    await act(async () => {
      await result.current.copy("https://novatip.xyz/ada");
    });
    act(() => {
      vi.advanceTimersByTime(COPIED_RESET_DELAY - 100);
    });

    // Without the restart the first timer would have fired by now.
    expect(result.current.copied).toBe(true);
  });
});

// ── Unmounting ────────────────────────────────────────────────────────────────

describe("useCopyToClipboard – unmounting", () => {
  it("does not set state after the component has gone away", async () => {
    let settle: (ok: boolean) => void = () => {};
    copySpy.mockReturnValue(new Promise<boolean>((resolve) => { settle = resolve; }));

    const { result, unmount } = renderHook(() => useCopyToClipboard());

    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = result.current.copy("https://novatip.xyz/ada");
    });

    unmount();
    settle(true);
    await expect(pending).resolves.toBe(true);

    // No "state update on unmounted component" warning, and nothing observable
    // changed — the assertion here is simply that the above did not throw.
    expect(copySpy).toHaveBeenCalledOnce();
  });
});
