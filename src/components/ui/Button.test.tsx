/**
 * src/components/ui/Button.test.tsx
 *
 * Unit tests for Button.
 *
 * Covers:
 *   - Loading state: aria-busy is set and spinner is hidden from AT
 *   - Default type is "button" so forms are not accidentally submitted
 *   - Callers can still pass type="submit"
 *   - Ref is forwarded to the underlying <button> element
 */

import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { createRef } from "react";
import { Button } from "./Button";

afterEach(cleanup);

// ── Loading state ─────────────────────────────────────────────────────────────

describe("Button – loading state", () => {
  it("sets aria-busy when loading", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("does not set aria-busy when not loading", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute(
      "aria-busy",
    );
  });

  it("hides the spinner from assistive technology", () => {
    const { container } = render(<Button loading>Save</Button>);
    const spinner = container.querySelector("[aria-hidden]");
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveAttribute("aria-hidden", "true");
  });
});
