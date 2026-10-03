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
 */

import { describe, it, expect, vi, afterEach } from "vitest";
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
