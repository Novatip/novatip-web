/**
 * src/components/WalletConnectButton.test.tsx
 *
 * Unit tests for WalletConnectButton.
 *
 * This is the entry point to the whole product — rendered in both headers,
 * the dashboard guard, and the onboarding gate — so its three states and the
 * actions each exposes are worth pinning directly.
 *
 * Covers:
 *   - Disconnected render: "Connect Wallet" button, no address, no Disconnect
 *   - Connecting render: button reads "Connecting…" and is busy
 *   - Connected render: shortened address shown, Disconnect button present
 *   - Clicking "Connect Wallet" invokes connect()
 *   - Clicking "Disconnect" invokes disconnect()
 *   - A connection error is surfaced while disconnected
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletConnectButton } from "./WalletConnectButton";

const mockWallet = vi.hoisted(() => ({
  publicKey:    null as string | null,
  jwt:          null as string | null,
  isConnected:  false,
  isConnecting: false,
  error:        null as string | null,
  connect:      vi.fn(),
  disconnect:   vi.fn(),
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => mockWallet,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockWallet.publicKey = null;
  mockWallet.isConnected = false;
  mockWallet.isConnecting = false;
  mockWallet.error = null;
});

const PUBLIC_KEY = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";

describe("WalletConnectButton – disconnected", () => {
  it("shows a Connect Wallet button", () => {
    render(<WalletConnectButton />);
    expect(screen.getByRole("button", { name: /connect freighter wallet/i })).toBeInTheDocument();
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("does not show an address or a Disconnect button", () => {
    render(<WalletConnectButton />);
    expect(screen.queryByText(PUBLIC_KEY)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /disconnect/i })).not.toBeInTheDocument();
  });

  it("surfaces a connection error", () => {
    mockWallet.error = "Freighter wallet extension not found.";
    render(<WalletConnectButton />);
    expect(screen.getByText("Freighter wallet extension not found.")).toBeInTheDocument();
  });

  it("invokes connect() when clicked", async () => {
    const user = userEvent.setup();
    render(<WalletConnectButton />);

    await user.click(screen.getByRole("button", { name: /connect freighter wallet/i }));

    expect(mockWallet.connect).toHaveBeenCalledTimes(1);
  });
});

describe("WalletConnectButton – connecting", () => {
  it("shows a busy 'Connecting…' button", () => {
    mockWallet.isConnecting = true;
    render(<WalletConnectButton />);

    const button = screen.getByRole("button", { name: /connect freighter wallet/i });
    expect(button).toHaveTextContent("Connecting…");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });
});

describe("WalletConnectButton – connected", () => {
  it("shows the connected address", () => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = PUBLIC_KEY;
    render(<WalletConnectButton />);

    expect(screen.getByText(`${PUBLIC_KEY.slice(0, 4)}…${PUBLIC_KEY.slice(-4)}`)).toBeInTheDocument();
  });

  it("does not show the Connect Wallet button", () => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = PUBLIC_KEY;
    render(<WalletConnectButton />);

    expect(screen.queryByText("Connect Wallet")).not.toBeInTheDocument();
  });

  it("exposes a Disconnect control", () => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = PUBLIC_KEY;
    render(<WalletConnectButton />);

    expect(screen.getByRole("button", { name: /disconnect wallet/i })).toBeInTheDocument();
  });

  it("invokes disconnect() when the Disconnect control is clicked", async () => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = PUBLIC_KEY;
    const user = userEvent.setup();
    render(<WalletConnectButton />);

    await user.click(screen.getByRole("button", { name: /disconnect wallet/i }));

    expect(mockWallet.disconnect).toHaveBeenCalledTimes(1);
  });
});
