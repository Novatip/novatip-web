/**
 * src/components/TipForm.test.tsx
 *
 * Render tests for TipForm with a mocked wallet, balance lookup and SDK.
 *
 * Covers:
 *   - Default state: preset amount, empty message, Send enabled
 *   - A valid custom amount is reflected in the Send button
 *   - A disconnected wallet shows the connect prompt instead of Send
 *   - A jar with no recipients is blocked and explained
 *   - An amount above the wallet balance disables Send and shows the warning
 *   - An empty wallet gets the missing-trustline explanation instead
 *   - An amount that rounds a collaborator's share to zero shows the
 *     splits-too-small warning (Send stays enabled — it is advisory)
 *   - An affordable amount with healthy shares shows neither warning
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TipForm } from "./TipForm";
import { LAST_TIP_AMOUNT_STORAGE_KEY } from "@/lib/lastTipAmount";

const PUBLIC_KEY = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW";

const mocks = vi.hoisted(() => ({
  getUsdcBalance: vi.fn<(address: string) => Promise<bigint>>(),
  tip: vi.fn(),
  wallet: { connected: true },
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({
    publicKey:    mocks.wallet.connected ? PUBLIC_KEY : null,
    jwt:          mocks.wallet.connected ? "jwt" : null,
    isConnected:  mocks.wallet.connected,
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
    getTipSplitterClient:  vi.fn(() => ({ tip: mocks.tip })),
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
  mocks.tip.mockReset();
  mocks.wallet.connected = true;
});

afterEach(() => {
  cleanup();
});

// ── Default state ─────────────────────────────────────────────────────────────

describe("TipForm – default state", () => {
  it("shows the default amount, an empty message and an enabled Send button", async () => {
    mocks.getUsdcBalance.mockResolvedValue(100n * USDC);
    render(<TipForm jarId="jar-1" slug="alice" splits={EVEN_SPLITS} />);

    expect(await screen.findByText(/Balance: \$100\.00/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /optional tip message/i })).toHaveValue("");
    expect(screen.getByText("0/280 bytes")).toBeInTheDocument();
    expect(sendButton()).toBeEnabled();
    expect(screen.queryByText(/no recipients configured/i)).not.toBeInTheDocument();
  });
});

// ── Valid amount ──────────────────────────────────────────────────────────────

describe("TipForm – valid amount", () => {
  it("puts a valid custom amount in the Send button and keeps it enabled", async () => {
    renderForm({ amount: "2", balance: 100n * USDC });
    expect(await screen.findByText(/Balance: \$100\.00/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Enter custom tip amount"), {
      target: { value: "7.5" },
    });

    expect(screen.getByRole("button", { name: "Send $7.5 USDC tip" })).toBeEnabled();
  });
});

describe("TipForm – submission errors", () => {
  it("shows a readable message for a rejected transaction result", async () => {
    const resultXdr = "AAAAAAAA+QT////6AAAAAA==";
    mocks.tip.mockRejectedValueOnce(new Error(`Transaction submission failed: ${resultXdr}`));
    renderForm({ amount: "2", balance: 100n * USDC });

    fireEvent.click(screen.getByRole("button", { name: "Send $2 USDC tip" }));

    const error = await screen.findByText(/Transaction rejected:.*txBAD_AUTH/);
    expect(error).not.toHaveTextContent(resultXdr);
  });

  it("shows an unrelated error unchanged", async () => {
    mocks.tip.mockRejectedValueOnce(new Error("RPC unreachable"));
    renderForm({ amount: "2", balance: 100n * USDC });

    fireEvent.click(screen.getByRole("button", { name: "Send $2 USDC tip" }));

    expect(await screen.findByText("RPC unreachable")).toBeInTheDocument();
  });
});

// ── Disconnected wallet ───────────────────────────────────────────────────────

describe("TipForm – disconnected wallet", () => {
  it("asks the supporter to connect and offers no Send button", () => {
    mocks.wallet.connected = false;
    render(<TipForm jarId="jar-1" slug="alice" splits={EVEN_SPLITS} />);

    expect(screen.getByText(/connect your wallet to send a tip/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send \$.+ USDC tip/i })).not.toBeInTheDocument();
    expect(mocks.getUsdcBalance).not.toHaveBeenCalled();
  });
});

// ── No recipients ─────────────────────────────────────────────────────────────

describe("TipForm – jar with no recipients", () => {
  it("explains the jar is unconfigured and blocks sending", async () => {
    mocks.getUsdcBalance.mockResolvedValue(100n * USDC);
    render(<TipForm jarId="jar-1" slug="alice" splits={[]} />);

    expect(await screen.findByText(/no recipients configured/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jar not configured" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: /optional tip message/i })).toBeDisabled();
  });
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
