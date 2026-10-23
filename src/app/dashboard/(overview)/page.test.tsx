/**
 * src/app/dashboard/(overview)/page.test.tsx
 *
 * Unit tests for the dashboard overview page.
 *
 * Covers:
 *   - The stat cards render the formatted totals once loaded
 *   - A failed totals request shows the error panel, and retry refetches
 *   - The jar status banner appears once the creator loads
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";

const totals    = vi.hoisted(() => vi.fn());
const me        = vi.hoisted(() => vi.fn());
const getBySlug = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  analyticsApi: { totals },
  authApi:      { me },
  creatorApi:   { getBySlug },
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({ jwt: "jwt" }),
}));

// These panels are independently tested elsewhere; stubbing them isolates
// the overview page's own fetch/error/retry wiring.
vi.mock("@/components/JarStatusBanner", () => ({
  JarStatusBanner: ({ jarId }: { jarId: string }) => (
    <div data-testid="jar-status-banner" data-jar-id={jarId} />
  ),
}));
vi.mock("@/components/TipChart", () => ({
  TipChart: () => <div data-testid="tip-chart" />,
}));
vi.mock("@/components/RecentTips", () => ({
  RecentTips: () => <div data-testid="recent-tips" />,
}));
vi.mock("@/components/Leaderboard", () => ({
  Leaderboard: () => <div data-testid="leaderboard" />,
}));
vi.mock("@/components/CollaboratorEarnings", () => ({
  CollaboratorEarnings: () => <div data-testid="collaborator-earnings" />,
}));

const MOCK_CREATOR = {
  id:          "creator-1",
  slug:        "ada",
  displayName: "Ada",
  bio:         null,
  avatarUrl:   null,
  email:       null,
  jarId:       "@ada",
  splits:      [{ to: "GD7UXR3IX276M2M4XUE3TPNKTA7PJTERTEDEGWELQQYQBBHDL2NTREFR", bps: 10000 }],
  createdAt:   "2024-01-01T00:00:00Z",
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("DashboardPage – stat cards", () => {
  it("renders the formatted totals once loaded", async () => {
    totals.mockResolvedValue({
      totalTips:        42,
      totalAmountRaw:   "125000000",
      uniqueSupporters: 7,
    });
    me.mockResolvedValue({ user: { slug: "ada" } });
    getBySlug.mockResolvedValue({ creator: MOCK_CREATOR });

    render(<DashboardPage />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("$12.50")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});

describe("DashboardPage – failed totals", () => {
  it("shows the error panel and refetches on retry", async () => {
    totals.mockRejectedValueOnce(new Error("Network down"));
    me.mockResolvedValue({ user: { slug: "ada" } });
    getBySlug.mockResolvedValue({ creator: MOCK_CREATOR });

    render(<DashboardPage />);

    expect(await screen.findByText("Network down")).toBeInTheDocument();

    totals.mockResolvedValueOnce({
      totalTips:        3,
      totalAmountRaw:   "10000000",
      uniqueSupporters: 9,
    });

    await userEvent.click(screen.getByRole("button", { name: /retry loading this panel/i }));

    await waitFor(() => expect(totals).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.queryByText("Network down")).not.toBeInTheDocument();
  });
});

describe("DashboardPage – jar status banner", () => {
  it("appears once the creator loads", async () => {
    totals.mockResolvedValue({
      totalTips:        0,
      totalAmountRaw:   "0",
      uniqueSupporters: 0,
    });
    me.mockResolvedValue({ user: { slug: "ada" } });
    getBySlug.mockResolvedValue({ creator: MOCK_CREATOR });

    render(<DashboardPage />);

    expect(screen.queryByTestId("jar-status-banner")).not.toBeInTheDocument();

    expect(await screen.findByTestId("jar-status-banner")).toHaveAttribute(
      "data-jar-id",
      "@ada",
    );
  });
});
