/**
 * src/hooks/usePolling.test.ts
 *
 * Unit tests for usePolling.
 *
 * Covers:
 *   - Runs immediately on mount, then every interval
 *   - Stops while the tab is hidden and calls onHidden
 *   - Refreshes immediately when the tab becomes visible again
 *   - Clears its timer and listener on unmount
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePolling } from "./usePolling";

let visibility: DocumentVisibilityState = "visible";

function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("usePolling", () => {
  it("runs on mount and then every interval", () => {
    const cb = vi.fn();
    renderHook(() => usePolling(cb, 1000));
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(cb).toHaveBeenCalledTimes(4);
  });

  it("does not poll while hidden and calls onHidden", () => {
    const cb = vi.fn();
    const onHidden = vi.fn();
    renderHook(() => usePolling(cb, 1000, { onHidden }));
    cb.mockClear();

    setVisibility("hidden");
    expect(onHidden).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(10_000); });
    expect(cb).not.toHaveBeenCalled();
  });

  it("refreshes immediately on becoming visible, then resumes the interval", () => {
    const cb = vi.fn();
    renderHook(() => usePolling(cb, 1000));
    setVisibility("hidden");
    cb.mockClear();

    setVisibility("visible");
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("stops polling and listening after unmount", () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => usePolling(cb, 1000));
    unmount();
    cb.mockClear();

    act(() => { vi.advanceTimersByTime(5000); });
    setVisibility("hidden");
    setVisibility("visible");
    expect(cb).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
