/**
 * src/app/dashboard/layout.test.tsx
 *
 * Unit tests for the dashboard layout.
 *
 * Covers:
 *   - A disconnected visitor sees the connect prompt
 *   - Every nav item renders as a link
 *   - Exactly one nav item has aria-current="page"
 *   - The header copy button's accessible name contains its visible text in
 *     the idle, copied and failed states
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import DashboardLayout from "./layout";
import { NAV_ITEMS } from "./nav";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}));

const mockNavigation = vi.hoisted(() => ({ pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockNavigation.pathname,
}));

const mockWallet = vi.hoisted(() => ({
  publicKey: null as string | null,
  jwt: null as string | null,
  isConnected: false,
  isConnecting: false,
  isSigningIn: false,
  error: null as string | null,
  connect: vi.fn(),
  retrySignIn: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => mockWallet,
}));

const mockMe = vi.hoisted(() => vi.fn());
const mockCopyText = vi.hoisted(() => vi.fn());

vi.mock("@/lib/clipboard", () => ({
  copyText: mockCopyText,
}));

// Mock the API so the layout doesn't attempt a real /auth/me call
vi.mock("@/lib/api", () => ({
  authApi: {
    me: mockMe,
  },
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

beforeEach(() => {
  mockMe.mockReset();
  mockMe.mockRejectedValue(new Error("Network error"));
  mockCopyText.mockReset();
});

afterEach(() => {
  cleanup();
  mockNavigation.pathname = "/dashboard";
  mockWallet.publicKey = null;
  mockWallet.jwt = null;
  mockWallet.isConnected = false;
});

describe("DashboardLayout – disconnected state", () => {
  beforeEach(() => {
    mockWallet.isConnected = false;
  });

  it("shows the connect prompt when wallet is disconnected", () => {
    render(
      <DashboardLayout>
        <div>Test content</div>
      </DashboardLayout>,
    );

    expect(screen.getByText(/connect your wallet to access the dashboard/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("does not render nav items when disconnected", () => {
    render(
      <DashboardLayout>
        <div>Test content</div>
      </DashboardLayout>,
    );

    // None of the nav labels should be present
    for (const item of NAV_ITEMS) {
      expect(
        screen.queryByRole("link", { name: new RegExp(item.label, "i") }),
      ).not.toBeInTheDocument();
    }
  });

  it("does not render children when disconnected", () => {
    render(
      <DashboardLayout>
        <div>Test dashboard content</div>
      </DashboardLayout>,
    );

    expect(screen.queryByText(/test dashboard content/i)).not.toBeInTheDocument();
  });
});

describe("DashboardLayout – connected state", () => {
  beforeEach(() => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";
    mockWallet.jwt = "mock.jwt.token";
  });

  it("renders every nav item as a link", () => {
    render(
      <DashboardLayout>
        <div>Test content</div>
      </DashboardLayout>,
    );

    // Check that all nav items are rendered as links with correct hrefs
    for (const item of NAV_ITEMS) {
      const links = screen.getAllByRole("link", { name: new RegExp(item.label, "i") });
      // Each item appears twice: once in mobile nav, once in sidebar
      expect(links).toHaveLength(2);
      links.forEach((link) => {
        expect(link).toHaveAttribute("href", item.href);
      });
    }
  });

  it("marks exactly one nav item with aria-current=page", () => {
    render(
      <DashboardLayout>
        <div>Test content</div>
      </DashboardLayout>,
    );

    // Find all links with aria-current="page"
    const currentLinks = screen.getAllByRole("link", { current: "page" });

    // Should be exactly 2: one in mobile nav, one in sidebar
    expect(currentLinks).toHaveLength(2);

    // Both should point to /dashboard (the mocked pathname)
    currentLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/dashboard");
    });
  });

  it("renders children when connected", () => {
    render(
      <DashboardLayout>
        <div>Test dashboard content</div>
      </DashboardLayout>,
    );

    expect(screen.getByText(/test dashboard content/i)).toBeInTheDocument();
  });
});

describe("DashboardLayout – navigation aria-current behavior", () => {
  beforeEach(() => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";
    mockWallet.jwt = "mock.jwt.token";
  });

  it("only the current page has aria-current, others do not", () => {
    render(
      <DashboardLayout>
        <div>Test content</div>
      </DashboardLayout>,
    );

    // The Overview link (matching /dashboard) should have aria-current
    const overviewLinks = screen.getAllByRole("link", { name: /overview/i });
    overviewLinks.forEach((link) => {
      expect(link).toHaveAttribute("aria-current", "page");
    });

    // Other nav items should not have aria-current
    const otherItems = NAV_ITEMS.filter((item) => item.href !== "/dashboard");
    for (const item of otherItems) {
      const links = screen.getAllByRole("link", { name: new RegExp(item.label, "i") });
      links.forEach((link) => {
        expect(link).not.toHaveAttribute("aria-current");
      });
    }
  });

  it("marks Webhooks active in both navigation menus on its route", () => {
    mockNavigation.pathname = "/dashboard/webhooks";
    render(
      <DashboardLayout>
        <div>Test content</div>
      </DashboardLayout>,
    );

    const currentLinks = screen.getAllByRole("link", { current: "page" });
    expect(currentLinks).toHaveLength(2);
    currentLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/dashboard/webhooks");
    });
  });
});

describe("DashboardLayout – tip link copy button", () => {
  beforeEach(() => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";
    mockWallet.jwt = "mock.jwt.token";
    mockMe.mockResolvedValue({ user: { sub: "1", wallet: "GABC", slug: "ada" } });
  });

  function renderLayout() {
    return render(
      <DashboardLayout>
        <div>Test content</div>
      </DashboardLayout>,
    );
  }

  it("is named by its visible text when idle", async () => {
    renderLayout();

    const button = await screen.findByRole("button", { name: /copy link/i });
    expect(button).toHaveAccessibleName("Copy link");
    expect(button).not.toHaveAttribute("aria-label");
  });

  it("is named by its visible text once copied", async () => {
    mockCopyText.mockResolvedValue(true);
    renderLayout();

    await userEvent.click(await screen.findByRole("button", { name: /copy link/i }));

    const button = await screen.findByRole("button", { name: /copied!/i });
    expect(button).toHaveTextContent("Copied!");
    expect(button).toHaveAccessibleName("Copied!");
  });

  it("is named by its visible text on failure, and no longer reads as the default", async () => {
    mockCopyText.mockResolvedValue(false);
    renderLayout();

    await userEvent.click(await screen.findByRole("button", { name: /copy link/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /failed/i })).toBeInTheDocument());
    const button = screen.getByRole("button", { name: /failed/i });
    expect(button).toHaveTextContent("Failed");
    expect(button.getAttribute("aria-label")).toBeNull();
    expect(button).toHaveAccessibleName("Failed to copy link");
    expect(button).not.toHaveAccessibleName("Copy link");
  });
});
