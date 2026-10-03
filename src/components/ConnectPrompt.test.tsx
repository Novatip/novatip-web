/**
 * src/components/ConnectPrompt.test.tsx
 *
 * Unit tests for ConnectPrompt.
 *
 * Covers:
 *   - A valid relative redirect is followed once connected
 *   - A protocol-relative redirect (//evil.example) is refused
 *   - An absolute URL redirect is refused
 *   - No redirect call is made when the redirect param is absent
 *   - Nothing renders once the wallet is already connected
 *   - Nothing renders without ?connect=true
 *   - The wallet's connect() is triggered once, auto, when the prompt applies
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { ConnectPrompt } from "./ConnectPrompt";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
  wallet: {
    publicKey:    null as string | null,
    jwt:          null as string | null,
    isConnected:  false,
    isConnecting: false,
    error:        null as string | null,
    connect:      vi.fn(async () => {}),
    disconnect:   vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => mocks.wallet,
}));

function setParams(query: string) {
  mocks.searchParams = new URLSearchParams(query);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.wallet.isConnected = false;
  mocks.wallet.isConnecting = false;
  setParams("");
});

// ── Valid redirect ────────────────────────────────────────────────────────────

describe("ConnectPrompt – valid redirect", () => {
  it("follows a relative redirect once the wallet connects", async () => {
    setParams("connect=true&redirect=%2Fdashboard%2Fsplits");
    const { rerender } = render(<ConnectPrompt />);

    mocks.wallet.isConnected = true;
    rerender(<ConnectPrompt />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/dashboard/splits"));
  });

  it("does not redirect while still disconnected", () => {
    setParams("connect=true&redirect=/dashboard");
    render(<ConnectPrompt />);

    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when no redirect param is present", () => {
    setParams("connect=true");
    const { rerender } = render(<ConnectPrompt />);

    mocks.wallet.isConnected = true;
    rerender(<ConnectPrompt />);

    expect(mocks.replace).not.toHaveBeenCalled();
  });
});

// ── Open-redirect guard ───────────────────────────────────────────────────────

describe("ConnectPrompt – open-redirect guard", () => {
  it("refuses a protocol-relative redirect (//evil.example)", () => {
    setParams("connect=true&redirect=//evil.example");
    const { rerender } = render(<ConnectPrompt />);

    mocks.wallet.isConnected = true;
    rerender(<ConnectPrompt />);

    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("refuses an absolute URL redirect", () => {
    setParams("connect=true&redirect=https://evil.example");
    const { rerender } = render(<ConnectPrompt />);

    mocks.wallet.isConnected = true;
    rerender(<ConnectPrompt />);

    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("refuses a redirect that doesn't start with /", () => {
    setParams("connect=true&redirect=dashboard");
    const { rerender } = render(<ConnectPrompt />);

    mocks.wallet.isConnected = true;
    rerender(<ConnectPrompt />);

    expect(mocks.replace).not.toHaveBeenCalled();
  });
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("ConnectPrompt – rendering", () => {
  it("renders nothing once the wallet is already connected", () => {
    setParams("connect=true&redirect=/dashboard");
    mocks.wallet.isConnected = true;
    const { container } = render(<ConnectPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing without ?connect=true", () => {
    setParams("");
    const { container } = render(<ConnectPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the connect prompt while disconnected with ?connect=true", () => {
    setParams("connect=true");
    render(<ConnectPrompt />);

    expect(
      screen.getByText(/that page needs a connected wallet/i),
    ).toBeInTheDocument();
  });

  it("shows a connecting message once the wallet connection is in flight", () => {
    setParams("connect=true");
    mocks.wallet.isConnecting = true;
    render(<ConnectPrompt />);

    expect(screen.getByText(/connecting your wallet/i)).toBeInTheDocument();
  });
});

// ── Auto-connect ──────────────────────────────────────────────────────────────

describe("ConnectPrompt – auto-connect", () => {
  it("triggers wallet.connect() once when the prompt applies", async () => {
    setParams("connect=true");
    render(<ConnectPrompt />);

    await waitFor(() => expect(mocks.wallet.connect).toHaveBeenCalledTimes(1));
  });

  it("does not call wallet.connect() without ?connect=true", async () => {
    setParams("");
    render(<ConnectPrompt />);

    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.wallet.connect).not.toHaveBeenCalled();
  });
});
