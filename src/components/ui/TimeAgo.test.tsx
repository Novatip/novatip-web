/**
 * src/components/ui/TimeAgo.test.tsx
 *
 * Unit tests for TimeAgo.
 *
 * Covers:
 *   - Renders the relative label as the visible text
 *   - Renders a <time> element carrying the ISO timestamp as dateTime
 *   - The title attribute reveals the absolute local time (formatAbsoluteTime's output)
 *   - Passes className through so the wrapper doesn't affect layout
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TimeAgo } from "./TimeAgo";
import { formatAbsoluteTime } from "@/lib/time";

afterEach(cleanup);

const ISO = "2026-01-05T15:45:12.000Z";

describe("TimeAgo", () => {
  it("renders the relative label as its visible text", () => {
    render(<TimeAgo iso={ISO}>3h ago</TimeAgo>);
    expect(screen.getByText("3h ago")).toBeInTheDocument();
  });

  it("renders a <time> element carrying the ISO timestamp", () => {
    render(<TimeAgo iso={ISO}>3h ago</TimeAgo>);
    const time = screen.getByText("3h ago");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", ISO);
  });

  it("sets the title to the absolute local time", () => {
    render(<TimeAgo iso={ISO}>3h ago</TimeAgo>);
    expect(screen.getByText("3h ago")).toHaveAttribute("title", formatAbsoluteTime(ISO));
  });

  it("passes className through to the <time> element", () => {
    render(
      <TimeAgo iso={ISO} className="text-xs text-fg-dim">
        3h ago
      </TimeAgo>,
    );
    expect(screen.getByText("3h ago")).toHaveClass("text-xs", "text-fg-dim");
  });
});
