/**
 * src/app/global-error.test.tsx
 *
 * Unit tests for the last-resort boundary that replaces the whole document
 * when the root layout itself throws.
 *
 * Covers:
 *   - It renders the fatal message and a retry control
 *   - Retry is wired to reset()
 *   - The escape hatch is a plain link to the homepage
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GlobalError from "./global-error";

function makeError(overrides: Partial<Error & { digest?: string }> = {}) {
  return Object.assign(new Error("Root layout exploded"), overrides) as Error & {
    digest?: string;
  };
}

afterEach(() => {
  cleanup();
});

describe("app/global-error", () => {
  it("renders the fatal message and a retry control", () => {
    render(<GlobalError error={makeError()} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /novatip hit a snag/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls reset when retry is clicked", async () => {
    const reset = vi.fn();
    render(<GlobalError error={makeError()} reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("points the escape link at the home page", () => {
    render(<GlobalError error={makeError()} reset={vi.fn()} />);

    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });
});
