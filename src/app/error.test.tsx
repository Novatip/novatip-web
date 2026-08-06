/**
 * src/app/error.test.tsx
 *
 * Unit tests for the route error boundary and the catch-all 404.
 *
 * Covers:
 *   - The error boundary offers a recovery action, not a dead end
 *   - reset() is wired to the retry control
 *   - The digest is surfaced (it is all a production report has to go on)
 *   - Raw error messages stay out of the production render
 *   - Both pages route the visitor back to the homepage
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "./error";
import NotFound from "./not-found";

// The header pulls in wallet context and the Freighter SDK; neither is what
// these tests are about.
vi.mock("@/components/Header", () => ({
  Header: () => <header data-testid="header" />,
}));

function makeError(overrides: Partial<Error & { digest?: string }> = {}) {
  return Object.assign(new Error("Resolver exploded"), overrides) as Error & {
    digest?: string;
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ── Error boundary ────────────────────────────────────────────────────────────

describe("app/error", () => {
  it("shows a recoverable message rather than a stack trace", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorPage error={makeError()} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("retries the failed segment when asked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    render(<ErrorPage error={makeError()} reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("surfaces the digest so a live report can be traced", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorPage error={makeError({ digest: "a1b2c3" })} reset={vi.fn()} />);

    expect(screen.getByText(/a1b2c3/)).toBeInTheDocument();
  });

  it("omits the digest line when there is none", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorPage error={makeError()} reset={vi.fn()} />);

    expect(screen.queryByText(/reference:/i)).not.toBeInTheDocument();
  });

  it("keeps the raw message out of the page in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ErrorPage error={makeError()} reset={vi.fn()} />);

    expect(screen.queryByText("Resolver exploded")).not.toBeInTheDocument();
  });

  it("shows the message in development, where it is the useful part", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ErrorPage error={makeError()} reset={vi.fn()} />);

    expect(screen.getByText("Resolver exploded")).toBeInTheDocument();
  });

  it("logs the error for anyone watching the console", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const error  = makeError();

    render(<ErrorPage error={error} reset={vi.fn()} />);

    expect(logged).toHaveBeenCalledWith("Unhandled route error:", error);
  });

  it("offers a route home", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorPage error={makeError()} reset={vi.fn()} />);

    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });
});

// ── Catch-all 404 ─────────────────────────────────────────────────────────────

describe("app/not-found", () => {
  it("renders a branded 404", () => {
    render(<NotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /page not found/i }),
    ).toBeInTheDocument();
  });

  it("routes the visitor back to the homepage", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });

  it("points newcomers at onboarding", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: /create your tip jar/i })).toHaveAttribute(
      "href",
      "/onboarding",
    );
  });
});
