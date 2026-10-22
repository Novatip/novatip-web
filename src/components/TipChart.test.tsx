/**
 * src/components/TipChart.test.tsx
 *
 * Behavioural tests for TipChart's controls and its empty state.
 *
 * The chart itself is decorative SVG, so these tests deliberately assert what
 * a person (or a screen reader) can actually perceive and operate:
 *
 *   - choosing a window refetches with that many days
 *   - switching count/USDC only changes how the existing series is displayed,
 *     and reports which mode is active through `aria-pressed`
 *   - a window with no tips shows the empty state instead of a flat chart
 *
 * A populated render is included alongside the mode assertions so the empty
 * state cannot pass merely by being the only branch that works: the mode
 * change has a visible effect on the chart's accessible label, which is the
 * difference between "the toggle updated" and "the toggle did something".
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TipChart } from "./TipChart";

const timeSeries = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  analyticsApi: { timeSeries },
}));

/** `fillSeries` keys days by UTC calendar date, so fixtures do the same. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function withToday() {
  return {
    series: [{ date: todayKey(), tipCount: 3, amountRaw: "50000000" }],
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TipChart – window control", () => {
  it("refetches with the new day count when the window changes", async () => {
    timeSeries.mockResolvedValue({ series: [] });
    const user = userEvent.setup();

    render(<TipChart jwt="jwt" />);

    await waitFor(() => expect(timeSeries).toHaveBeenCalledTimes(1));
    expect(timeSeries.mock.calls[0]![0]).toBe("jwt");
    expect(timeSeries.mock.calls[0]![1]).toBe(30); // default window

    await user.click(screen.getByRole("button", { name: "7d" }));

    await waitFor(() => expect(timeSeries).toHaveBeenCalledTimes(2));
    expect(timeSeries.mock.calls[1]![0]).toBe("jwt");
    expect(timeSeries.mock.calls[1]![1]).toBe(7);

    // The window control reports the newly selected window, not just the
    // button that happens to look active.
    expect(screen.getByRole("button", { name: "7d" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "30d" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("TipChart – mode toggle", () => {
  it("reflects the active mode through aria-pressed without refetching", async () => {
    timeSeries.mockResolvedValue(withToday());
    const user = userEvent.setup();

    render(<TipChart jwt="jwt" />);

    // Wait for the series to render before touching the controls, so the
    // fetch count below is the settled count.
    await screen.findByRole("img", {
      name: "Daily tip count over the last 30 days",
    });

    const countButton  = screen.getByRole("button", { name: "Tips" });
    const amountButton = screen.getByRole("button", { name: "USDC" });

    expect(countButton).toHaveAttribute("aria-pressed", "true");
    expect(amountButton).toHaveAttribute("aria-pressed", "false");

    await user.click(amountButton);

    expect(amountButton).toHaveAttribute("aria-pressed", "true");
    expect(countButton).toHaveAttribute("aria-pressed", "false");

    // The same data is re-labelled, not re-requested: switching units is a
    // presentation change and must not cost a network round trip.
    expect(
      screen.getByRole("img", {
        name: "Daily USDC earned over the last 30 days",
      }),
    ).toBeInTheDocument();
    expect(timeSeries).toHaveBeenCalledTimes(1);

    // The summary is derived from the same series, so it stays meaningful
    // in both modes rather than collapsing when the unit changes.
    expect(screen.getByText("$5.00")).toBeInTheDocument();
  });
});

describe("TipChart – empty state", () => {
  it("shows an empty state when no day in the window has a tip", async () => {
    timeSeries.mockResolvedValue({ series: [] });

    render(<TipChart jwt="jwt" />);

    expect(
      await screen.findByText("No tips in this window yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Share your tip link to get started."),
    ).toBeInTheDocument();

    // A flat line at zero reads as "the chart is broken", which is exactly
    // what the empty state exists to prevent.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("does not show the empty state when the window contains tips", async () => {
    timeSeries.mockResolvedValue(withToday());

    render(<TipChart jwt="jwt" />);

    await screen.findByRole("img", {
      name: "Daily tip count over the last 30 days",
    });

    expect(
      screen.queryByText("No tips in this window yet."),
    ).not.toBeInTheDocument();
  });
});
