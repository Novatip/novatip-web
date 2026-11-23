/**
 * src/components/AccountChangeBanner.test.tsx
 *
 * Unit tests for AccountChangeBanner.
 *
 * Covers:
 *   - A different active Freighter account shows a reconnect prompt naming both
 *   - No prompt while the active account matches, or when disconnected
 *   - Reconnect ends the old session before connecting again
 *   - The prompt goes away once the user switches back
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountChangeBanner } from "./AccountChangeBanner";
import { ACTIVE_ACCOUNT_POLL_MS } from "@/hooks/useActiveAccountChange";

const getActiveAddress = vi.hoisted(() => vi.fn());

vi.mock("@/lib/wallet", () => ({ getActiveAddress }));

const mockWallet = vi.hoisted(() => ({
  publicKey: null as string | null,
  isConnecting: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => mockWallet,
}));

const CONNECTED = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";
const OTHER = "GZYXWVUTSRQPONMLKJIHGFEDCBA0987654321ZYXWVUTSRQPONMLKJI";

async function settle(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mockWallet.publicKey = CONNECTED;
  mockWallet.isConnecting = false;
  mockWallet.connect.mockReset();
  mockWallet.disconnect.mockReset();
  getActiveAddress.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AccountChangeBanner", () => {
  it("prompts to reconnect when Freighter is on a different account", async () => {
    getActiveAddress.mockResolvedValue(OTHER);

    render(<AccountChangeBanner />);
    await settle();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("GZYX…LKJI");
    expect(alert).toHaveTextContent("GABC…OPQR");
    expect(
      screen.getByRole("button", { name: "Reconnect with the active Freighter account" }),
    ).toBeInTheDocument();
  });

  it("shows nothing while the active account is the connected one", async () => {
    getActiveAddress.mockResolvedValue(CONNECTED);

    render(<AccountChangeBanner />);
    await settle(ACTIVE_ACCOUNT_POLL_MS);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows nothing, and never asks Freighter, when disconnected", async () => {
    mockWallet.publicKey = null;

    render(<AccountChangeBanner />);
    await settle(ACTIVE_ACCOUNT_POLL_MS);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getActiveAddress).not.toHaveBeenCalled();
  });

  it("shows the prompt when the account is switched after the page loaded", async () => {
    getActiveAddress.mockResolvedValue(CONNECTED);
    render(<AccountChangeBanner />);
    await settle();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    getActiveAddress.mockResolvedValue(OTHER);
    await settle(ACTIVE_ACCOUNT_POLL_MS);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("removes the prompt when the user switches back", async () => {
    getActiveAddress.mockResolvedValue(OTHER);
    render(<AccountChangeBanner />);
    await settle();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    getActiveAddress.mockResolvedValue(CONNECTED);
    await settle(ACTIVE_ACCOUNT_POLL_MS);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ends the old session, then connects, when Reconnect is clicked", async () => {
    getActiveAddress.mockResolvedValue(OTHER);
    const calls: string[] = [];
    mockWallet.disconnect.mockImplementation(() => {
      calls.push("disconnect");
    });
    mockWallet.connect.mockImplementation(async () => {
      calls.push("connect");
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountChangeBanner />);
    await settle();

    await user.click(
      screen.getByRole("button", { name: "Reconnect with the active Freighter account" }),
    );

    expect(calls).toEqual(["disconnect", "connect"]);
  });
});
