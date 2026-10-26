/**
 * src/components/Header.test.tsx
 *
 * Unit tests for Header.
 *
 * Covers:
 *   - The Dashboard link is absent when no wallet is connected — a visitor
 *     should never see a link to a dashboard they can't use
 *   - The Dashboard link is present, and points at /dashboard, once connected
 *   - The logo links back to the home page
 *   - Network badge shows when not on mainnet
 *   - Network badge is hidden on mainnet
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { Header } from "./Header";

// The logo image's own rendering isn't under test here — only that the
// link around it points home — so next/image's runtime behaviour, which
// Vitest doesn't replicate, is sidestepped rather than relied on.
vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}));

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

// Mock config to control network value
const mockConfig = vi.hoisted(() => ({
  stellar: {
    network: "testnet" as "testnet" | "mainnet" | "local",
  },
}));

vi.mock("@/lib/config", async () => {
  const actual = await vi.importActual("@/lib/config");
  return {
    ...actual,
    config: mockConfig,
  };
});

afterEach(() => {
  cleanup();
  mockWallet.publicKey = null;
  mockWallet.isConnected = false;
});

describe("Header – disconnected", () => {
  it("does not show a Dashboard link when no wallet is connected", () => {
    mockWallet.isConnected = false;
    render(<Header />);

    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
  });
});

describe("Header – connected", () => {
  it("shows a Dashboard link pointing at /dashboard once connected", () => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";
    render(<Header />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});

describe("Header – logo", () => {
  it("links the logo back to the home page", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /novatip home/i })).toHaveAttribute("href", "/");
  });
});

describe("Header – network badge", () => {
  it("shows the network badge when running on testnet", () => {
    mockConfig.stellar.network = "testnet";
    render(<Header />);
    expect(screen.getByText("testnet")).toBeInTheDocument();
  });

  it("shows the network badge when running on local", () => {
    mockConfig.stellar.network = "local";
    render(<Header />);
    expect(screen.getByText("local")).toBeInTheDocument();
  });

  it("hides the network badge when running on mainnet", () => {
    mockConfig.stellar.network = "mainnet";
    render(<Header />);
    expect(screen.queryByText("mainnet")).not.toBeInTheDocument();
  });
});
