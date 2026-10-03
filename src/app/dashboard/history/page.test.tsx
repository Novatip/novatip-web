/**
 * src/app/dashboard/history/page.test.tsx
 *
 * Accessibility tests for the history page's "Load more" control, plus the
 * pagination rules themselves.
 *
 * Covers:
 *   - The number of newly appended rows is announced politely (aria-live)
 *   - The in-flight state is conveyed on the button, not just as a spinner
 *   - Focus is not stolen from the button when a page lands
 *   - A second page is appended without duplicating a row repeated across
 *     the offset boundary
 *   - The "all tips shown" cap message appears once the total reaches
 *     RECENT_TIPS_MAX_LIMIT
 *   - hasMore (and the Load more button) goes away once a page shorter than
 *     the page size comes back
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryPage from "./page";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const recent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  analyticsApi: { recent },
  RECENT_TIPS_MAX_LIMIT: 100,
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({ jwt: "jwt" }),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function makeTips(count: number, startId = 0) {
  return Array.from({ length: count }, (_, i) => ({
    id: `tip-${startId + i}`,
    fromAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR",
    amount: "50000000",
    message: "great work",
    ledgerAt: "2024-01-01T00:00:00Z",
  }));
}

/** First page is full (so "Load more" shows); the second page is short. */
function twoPages(secondPageSize: number) {
  recent
    .mockResolvedValueOnce({ tips: makeTips(PAGE_SIZE, 0) })
    .mockResolvedValueOnce({ tips: makeTips(secondPageSize, PAGE_SIZE) });
}

// ── Announcement ──────────────────────────────────────────────────────────────

describe("HistoryPage – load more announcement", () => {
  it("politely announces the number of newly added rows", async () => {
    twoPages(3);
    const user = userEvent.setup();

    render(<HistoryPage />);

    const button = await screen.findByRole("button", { name: "Load more" });
    await user.click(button);

    const status = await screen.findByRole("status");
    await waitFor(() =>
      expect(status).toHaveTextContent("3 more tips loaded."),
    );
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("uses the singular form when exactly one row is added", async () => {
    twoPages(1);
    const user = userEvent.setup();

    render(<HistoryPage />);

    const button = await screen.findByRole("button", { name: "Load more" });
    await user.click(button);

    const status = await screen.findByRole("status");
    await waitFor(() =>
      expect(status).toHaveTextContent("1 more tip loaded."),
    );
  });

  it("does not announce anything for the initial page load", async () => {
    twoPages(3);

    render(<HistoryPage />);

    await screen.findByRole("button", { name: "Load more" });
    expect(screen.getByRole("status")).toHaveTextContent("");
  });
});

// ── In-flight state ───────────────────────────────────────────────────────────

describe("HistoryPage – in-flight state", () => {
  it("conveys the in-flight state on the button while the request is pending", async () => {
    let resolveSecond: (value: { tips: ReturnType<typeof makeTips> }) => void;
    recent
      .mockResolvedValueOnce({ tips: makeTips(PAGE_SIZE, 0) })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const user = userEvent.setup();
    render(<HistoryPage />);

    const button = await screen.findByRole("button", { name: "Load more" });
    await user.click(button);

    // The label changes and aria-busy is set, so the state is conveyed to AT
    // rather than only shown as a spinner.
    const busy = await screen.findByRole("button", { name: "Loading more…" });
    expect(busy).toHaveAttribute("aria-busy", "true");

    resolveSecond!({ tips: makeTips(3, PAGE_SIZE) });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Load more" }),
      ).not.toHaveAttribute("aria-busy"),
    );
  });
});

// ── Focus ─────────────────────────────────────────────────────────────────────

describe("HistoryPage – focus", () => {
  it("keeps focus on the button after a page lands", async () => {
    twoPages(3);
    const user = userEvent.setup();

    render(<HistoryPage />);

    const button = await screen.findByRole("button", { name: "Load more" });
    await user.click(button);

    await screen.findByRole("status");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("3 more tips loaded."),
    );

    expect(button).toHaveFocus();
  });
});

// ── Pagination rules ──────────────────────────────────────────────────────────

describe("HistoryPage – pagination", () => {
  it("appends a second page without duplicating a row repeated across the offset boundary", async () => {
    // The component's own comment explains why this happens: a tip indexed
    // between pages shifts the offset by one, repeating the last row of the
    // previous page. tip-19 (the last id of page one) is repeated here.
    recent
      .mockResolvedValueOnce({ tips: makeTips(PAGE_SIZE, 0) }) // tip-0..tip-19
      .mockResolvedValueOnce({ tips: makeTips(5, PAGE_SIZE - 1) }); // tip-19..tip-23
    const user = userEvent.setup();

    render(<HistoryPage />);

    const button = await screen.findByRole("button", { name: "Load more" });
    // +1 for the column-header row, which also carries role="row".
    expect(screen.getAllByRole("row")).toHaveLength(PAGE_SIZE + 1);

    await user.click(button);

    await waitFor(() => {
      // 20 from page one + 4 genuinely new from page two — tip-19 is
      // filtered out as already shown, not appended a second time.
      expect(screen.getAllByRole("row")).toHaveLength(PAGE_SIZE + 4 + 1);
    });
    expect(recent).toHaveBeenNthCalledWith(2, "jwt", PAGE_SIZE, expect.anything(), PAGE_SIZE);
  });

  it("shows the cap message once the loaded total reaches RECENT_TIPS_MAX_LIMIT", async () => {
    recent.mockResolvedValueOnce({ tips: makeTips(100, 0) });

    render(<HistoryPage />);

    await waitFor(() =>
      expect(screen.getByText("Showing all tips (100 max)")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("drops hasMore (and the Load more button) once a page shorter than the page size comes back", async () => {
    recent.mockResolvedValueOnce({ tips: makeTips(7, 0) }); // fewer than PAGE_SIZE

    render(<HistoryPage />);

    await waitFor(() =>
      expect(screen.getByText(/that.s all your tips/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });
});
