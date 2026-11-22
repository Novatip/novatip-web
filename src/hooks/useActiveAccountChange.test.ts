/**
 * src/hooks/useActiveAccountChange.test.ts
 *
 * Unit tests for useActiveAccountChange.
 *
 * Covers:
 *   - Returns the active address once Freighter reports a different account
 *   - Returns null while the active account matches the connected one
 *   - Returns null when the extension will not say which account is active
 *   - Picks up a later switch, and clears again when switching back
 *   - Stops asking while the tab is hidden, and checks again on return
 *   - Does not ask at all when nothing is connected
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActiveAccountChange, ACTIVE_ACCOUNT_POLL_MS } from "./useActiveAccountChange";

const getActiveAddress = vi.hoisted(() => vi.fn());

vi.mock("@/lib/wallet", () => ({ getActiveAddress }));

const CONNECTED = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";
const OTHER     = "GZYXWVUTSRQPONMLKJIHGFEDCBA0987654321ZYXWVUTSRQPONMLKJI";

let visibility: DocumentVisibilityState = "visible";

function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

/** Advance the clock and let the awaited getActiveAddress() promise settle. */
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  getActiveAddress.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useActiveAccountChange", () => {
  it("returns the active address when Freighter is on a different account", async () => {
    getActiveAddress.mockResolvedValue(OTHER);

    const { result } = renderHook(() => useActiveAccountChange(CONNECTED));
    await tick(0);

    expect(result.current).toBe(OTHER);
  });

  it("returns null while the active account is the connected one", async () => {
    getActiveAddress.mockResolvedValue(CONNECTED);

    const { result } = renderHook(() => useActiveAccountChange(CONNECTED));
    await tick(ACTIVE_ACCOUNT_POLL_MS * 2);

    expect(result.current).toBeNull();
  });

  it("returns null when the extension will not say which account is active", async () => {
    getActiveAddress.mockResolvedValue(null);

    const { result } = renderHook(() => useActiveAccountChange(CONNECTED));
    await tick(ACTIVE_ACCOUNT_POLL_MS);

    expect(result.current).toBeNull();
  });

  it("returns null when asking the extension throws", async () => {
    getActiveAddress.mockRejectedValue(new Error("extension closed"));

    const { result } = renderHook(() => useActiveAccountChange(CONNECTED));
    await tick(ACTIVE_ACCOUNT_POLL_MS);

    expect(result.current).toBeNull();
  });

  it("notices a switch made later, and clears when switched back", async () => {
    getActiveAddress.mockResolvedValue(CONNECTED);
    const { result } = renderHook(() => useActiveAccountChange(CONNECTED));
    await tick(0);
    expect(result.current).toBeNull();

    getActiveAddress.mockResolvedValue(OTHER);
    await tick(ACTIVE_ACCOUNT_POLL_MS);
    expect(result.current).toBe(OTHER);

    getActiveAddress.mockResolvedValue(CONNECTED);
    await tick(ACTIVE_ACCOUNT_POLL_MS);
    expect(result.current).toBeNull();
  });

  it("stops asking while the tab is hidden", async () => {
    getActiveAddress.mockResolvedValue(CONNECTED);
    renderHook(() => useActiveAccountChange(CONNECTED));
    await tick(0);

    setVisibility("hidden");
    getActiveAddress.mockClear();
    await tick(ACTIVE_ACCOUNT_POLL_MS * 10);

    expect(getActiveAddress).not.toHaveBeenCalled();
  });

  it("checks again straight away when the tab becomes visible", async () => {
    getActiveAddress.mockResolvedValue(CONNECTED);
    const { result } = renderHook(() => useActiveAccountChange(CONNECTED));
    await tick(0);

    setVisibility("hidden");
    getActiveAddress.mockResolvedValue(OTHER);
    await tick(ACTIVE_ACCOUNT_POLL_MS * 10);
    expect(result.current).toBeNull();

    setVisibility("visible");
    await tick(0);

    expect(result.current).toBe(OTHER);
  });

  it("does not ask when nothing is connected", async () => {
    const { result } = renderHook(() => useActiveAccountChange(null));
    await tick(ACTIVE_ACCOUNT_POLL_MS * 3);

    expect(getActiveAddress).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });
});
