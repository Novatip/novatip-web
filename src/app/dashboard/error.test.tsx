/**
 * src/app/dashboard/error.test.tsx
 *
 * Unit tests for the dashboard's segment-level error boundary.
 *
 * Covers:
 *   - A thrown error renders a recoverable message, not a dead end
 *   - reset() is wired to the retry control
 *   - The digest is surfaced when present
 *   - The error is logged for anyone watching the console
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardError from "./error";

function makeError(overrides: Partial<Error & { digest?: string }> = {}) {
  return Object.assign(new Error("Analytics query exploded"), overrides) as Error & {
    digest?: string;
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("app/dashboard/error", () => {
  it("shows a recoverable message rather than a stack trace", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DashboardError error={makeError()} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /this page hit a snag/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("retries the failed segment when asked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    render(<DashboardError error={makeError()} reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("surfaces the digest so a live report can be traced", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DashboardError error={makeError({ digest: "a1b2c3" })} reset={vi.fn()} />);

    expect(screen.getByText(/a1b2c3/)).toBeInTheDocument();
  });

  it("omits the digest line when there is none", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DashboardError error={makeError()} reset={vi.fn()} />);

    expect(screen.queryByText(/reference:/i)).not.toBeInTheDocument();
  });

  it("logs the error for anyone watching the console", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = makeError();

    render(<DashboardError error={error} reset={vi.fn()} />);

    expect(logged).toHaveBeenCalledWith("Unhandled dashboard error:", error);
  });
});
