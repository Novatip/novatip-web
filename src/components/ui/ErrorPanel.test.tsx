/**
 * src/components/ui/ErrorPanel.test.tsx
 *
 * Unit tests for ErrorPanel.
 *
 * Covers:
 *   - Renders the error message
 *   - The container has role="alert" so the message is announced
 *   - Clicking Retry calls onRetry
 *   - The retry control is disabled while a retry is in flight
 *   - The retry control is enabled and clickable when not retrying
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorPanel } from "./ErrorPanel";

afterEach(cleanup);

describe("ErrorPanel", () => {
  it("renders the error message", () => {
    render(<ErrorPanel message="Failed to load totals" onRetry={vi.fn()} />);
    expect(screen.getByText("Failed to load totals")).toBeInTheDocument();
  });

  it("announces the message as an alert", () => {
    render(<ErrorPanel message="Failed to load totals" onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load totals");
  });

  it("calls onRetry when the retry control is clicked", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorPanel message="Failed to load" onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables the retry control while a retry is in flight", () => {
    render(<ErrorPanel message="Failed to load" onRetry={vi.fn()} retrying />);
    expect(screen.getByRole("button", { name: /retry/i })).toBeDisabled();
  });

  it("keeps the retry control enabled when not retrying", () => {
    render(<ErrorPanel message="Failed to load" onRetry={vi.fn()} retrying={false} />);
    expect(screen.getByRole("button", { name: /retry/i })).toBeEnabled();
  });
});
