/**
 * src/components/TipForm.test.tsx
 *
 * Unit tests for TipForm's pre-submit guards.
 *
 * Covers:
 *   - An amount above the wallet balance disables Send and shows the warning
 *   - An empty wallet gets the missing-trustline explanation instead
 *   - An amount that rounds a collaborator's share to zero shows the
 *     splits-too-small warning (Send stays enabled — it is advisory)
 *   - An affordable amount with healthy shares shows neither warning
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TipForm } from "./TipForm";
import { LAST_TIP_AMOUNT_STORAGE_KEY } from "@/lib/lastTipAmount";

const PUBLIC_KEY = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW";

const mocks = vi.hoisted(() => ({
  getUsdcBalance: vi.fn<(address: string) => Promise<bigint>>(),
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({
    publicKey:    PUBLIC_KEY,
    jwt:          "jwt",
    isConnected:  true,
    isConnecting: false,
    error:        null,
    connect:      vi.fn(),
    disconnect:   vi.fn(),
  }),
}));

vi.mock("@/lib/balance", () => ({
  getUsdcBalance: mocks.getUsdcBalance,
}));

vi.mock("@/lib/wallet", async () => {
  const sdk = await import("@novatip/sdk");
  return {
    assertActiveAccount:   vi.fn(),
    getTipSplitterClient:  vi.fn(),
    makeSignTransaction:   vi.fn(),
    usdcToStroops:         sdk.usdcToStroops,
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const USDC = 10_000_000n;
const EVEN_SPLITS = [
  { to: "GAAA", bps: 5_000 },
  { to: "GBBB", bps: 5_000 },
];

function renderForm(opts: {
  amount:  string;
  balance: bigint;
  splits?: { to: string; bps: number }[];
}) {
  window.localStorage.setItem(LAST_TIP_AMOUNT_STORAGE_KEY, opts.amount);
  mocks.getUsdcBalance.mockResolvedValue(opts.balance);
  render(<TipForm jarId="jar-1" slug="alice" splits={opts.splits ?? EVEN_SPLITS} />);
}

function sendButton() {
  return screen.getByRole("button", { name: /Send \$.+ USDC tip/i });
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.getUsdcBalance.mockReset();
});

afterEach(() => {
  cleanup();
});

// ── Insufficient balance ──────────────────────────────────────────────────────

describe("TipForm – insufficient balance", () => {
  it("disables Send and warns when the amount exceeds the balance", async () => {
    renderForm({ amount: "5", balance: 1n * USDC });

    expect(await screen.findByText(/more than your USDC balance/i)).toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
  });

  it("explains the missing trustline when the balance is zero", async () => {
    renderForm({ amount: "5", balance: 0n });

    expect(await screen.findByText(/no USDC on Stellar/i)).toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
  });
});

// ── Zero share ────────────────────────────────────────────────────────────────

describe("TipForm – zero share warning", () => {
  it("warns when the amount rounds a collaborator's share to zero", async () => {
    // 0.00001 USDC = 100 stroops; 100 * 50 / 10_000 rounds down to 0.
    renderForm({
      amount:  "0.00001",
      balance: 100n * USDC,
      splits:  [
        { to: "GAAA", bps: 50 },
        { to: "GBBB", bps: 9_950 },
      ],
    });

    expect(await screen.findByText(/would receive nothing/i)).toBeInTheDocument();
    expect(screen.getByText("1 of 2 collaborators")).toBeInTheDocument();
    // The warning is advisory — it does not block the tip.
    expect(sendButton()).toBeEnabled();
  });
});

// ── Neither ───────────────────────────────────────────────────────────────────

describe("TipForm – affordable amount with healthy shares", () => {
  it("shows neither warning and leaves Send enabled", async () => {
    renderForm({ amount: "2", balance: 100n * USDC });

    // Wait for the balance to load so the checks have actually run.
    expect(await screen.findByText(/Balance: \$100\.00/)).toBeInTheDocument();

    expect(screen.queryByText(/more than your USDC balance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no USDC on Stellar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/would receive nothing/i)).not.toBeInTheDocument();
    expect(sendButton()).toBeEnabled();
  });
});
