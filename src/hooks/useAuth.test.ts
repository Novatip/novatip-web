/**
 * src/hooks/useAuth.test.ts
 *
 * Unit tests for useAuth.
 *
 * Covers:
 *   - requireAuth returns true and does not redirect when connected
 *   - requireAuth redirects to the connect flow and returns false when not connected
 *   - the redirect path is encoded such that a path carrying its own query
 *     string round-trips intact through the outer URL's query string
 *   - requireAuth keeps a stable identity across renders when its inputs are unchanged
 *   - requireAuth gets a new identity once isConnected actually changes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "./useAuth";

const mocks = vi.hoisted(() => {
  const push = vi.fn();
  return {
    push,
    pathname: "/dashboard",
    router: { push },
    wallet: {
      publicKey:    null as string | null,
      jwt:          null as string | null,
      isConnected:  false,
      isConnecting: false,
      error:        null as string | null,
      connect:      vi.fn(),
      disconnect:   vi.fn(),
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter:   () => mocks.router,
  usePathname: () => mocks.pathname,
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => mocks.wallet,
}));

beforeEach(() => {
  mocks.push.mockClear();
  mocks.wallet.isConnected = false;
  mocks.pathname = "/dashboard";
});

describe("useAuth", () => {
  it("returns true and does not redirect when connected", () => {
    mocks.wallet.isConnected = true;
    const { result } = renderHook(() => useAuth());

    expect(result.current.requireAuth()).toBe(true);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("redirects to the connect flow and returns false when not connected", () => {
    mocks.wallet.isConnected = false;
    const { result } = renderHook(() => useAuth());

    expect(result.current.requireAuth()).toBe(false);
    expect(mocks.push).toHaveBeenCalledWith("/?connect=true&redirect=%2Fdashboard");
  });

  it("encodes a path carrying its own query string so it round-trips intact through the outer URL", () => {
    // usePathname() never actually includes a query string in real Next.js —
    // but requireAuth must not assume that. If the encoding here were ever
    // swapped for something looser (encodeURI, or no encoding), a path like
    // this would reintroduce its own "&"/"=" into the OUTER query string,
    // corrupting it rather than surviving as one opaque redirect value.
    mocks.wallet.isConnected = false;
    mocks.pathname = "/dashboard?tab=overview&ref=email";
    const { result } = renderHook(() => useAuth());

    result.current.requireAuth();

    expect(mocks.push).toHaveBeenCalledTimes(1);
    const pushedUrl = mocks.push.mock.calls[0]![0] as string;

    // Parse the pushed URL the way a real router would, and confirm the
    // original path survives as a single, intact value — not fragmented
    // into extra top-level params.
    const outerParams = new URLSearchParams(pushedUrl.slice(pushedUrl.indexOf("?") + 1));
    expect(outerParams.get("connect")).toBe("true");
    expect(outerParams.get("redirect")).toBe("/dashboard?tab=overview&ref=email");
    expect([...outerParams.keys()]).toEqual(["connect", "redirect"]);
  });

  it("keeps a stable requireAuth identity across renders when inputs are unchanged", () => {
    mocks.wallet.isConnected = true;
    const { result, rerender } = renderHook(() => useAuth());
    const first = result.current.requireAuth;

    rerender();

    expect(result.current.requireAuth).toBe(first);
  });

  it("gives requireAuth a new identity once isConnected changes", () => {
    mocks.wallet.isConnected = false;
    const { result, rerender } = renderHook(() => useAuth());
    const first = result.current.requireAuth;

    mocks.wallet.isConnected = true;
    rerender();

    expect(result.current.requireAuth).not.toBe(first);
  });
});
