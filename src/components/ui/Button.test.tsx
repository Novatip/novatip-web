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

// ── Default type ──────────────────────────────────────────────────────────────

describe("Button – type attribute", () => {
  it('defaults to type="button" to avoid accidental form submission', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button", { name: "Click" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it('accepts type="submit" when explicitly set', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});

// ── Ref forwarding ────────────────────────────────────────────────────────────

describe("Button – ref forwarding", () => {
  it("attaches the ref to the underlying button element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Click</Button>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("BUTTON");
  });

  it("ref points to the same node as the rendered button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Click</Button>);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Click" }));
  });
});
