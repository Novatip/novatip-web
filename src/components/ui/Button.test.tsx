/**
 * src/components/ui/Button.test.tsx
 *
 * Unit tests for Button.
 *
 * Covers:
 *   - Loading state: aria-busy is set and spinner is hidden from AT
 *   - Loading disables the button, and a click while loading never fires onClick
 *   - An explicit disabled prop also blocks the click handler
 *   - A click fires normally when neither loading nor disabled
 *   - A caller-supplied className overriding a conflicting base/variant style
 *   - Default type is "button" so forms are not accidentally submitted
 *   - Callers can still pass type="submit"
 *   - Ref is forwarded to the underlying <button> element
 *   - Each variant and size applies its expected classes
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// ── Disabled-while-loading + click handling ───────────────────────────────────

describe("Button – disabled while loading", () => {
  it("disables the button while loading", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("does not fire onClick when clicked while loading", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button loading onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not fire onClick when explicitly disabled (loading or not)", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button disabled onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("fires onClick normally when neither loading nor disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is not disabled, and fires onClick, when loading is explicitly false", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button loading={false} onClick={onClick}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ── className override ────────────────────────────────────────────────────────

describe("Button – className override", () => {
  it("lets a caller-supplied className override a conflicting base style", () => {
    // primary's variant background (bg-brand-500) is a base/variant class;
    // a caller passing a conflicting utility must win via twMerge, not just
    // get appended alongside the one it's meant to replace.
    render(<Button className="bg-red-500">Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toHaveClass("bg-red-500");
    expect(button).not.toHaveClass("bg-brand-500");
  });

  it("keeps non-conflicting base classes alongside the override", () => {
    render(<Button className="bg-red-500">Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });

    // Layout classes are untouched — only the conflicting background utility
    // group is resolved in the caller's favour.
    expect(button).toHaveClass("inline-flex", "rounded-xl");
  });
});

// ── Variants and sizes ────────────────────────────────────────────────────────

describe("Button – variants", () => {
  it("applies the primary variant's classes by default", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("bg-brand-500", "text-white");
  });

  it("applies the secondary variant's classes", () => {
    render(<Button variant="secondary">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "bg-surface-strong",
      "border",
      "border-hairline-strong",
    );
  });

  it("applies the ghost variant's classes", () => {
    render(<Button variant="ghost">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("text-fg-muted");
  });

  it("applies the danger variant's classes", () => {
    render(<Button variant="danger">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "bg-danger/20",
      "text-danger",
      "border-danger/30",
    );
  });
});

describe("Button – sizes", () => {
  it("applies the md size's classes by default", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("px-5", "rounded-xl");
  });

  it("applies the sm size's classes", () => {
    render(<Button size="sm">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("px-3", "rounded-lg");
  });

  it("applies the lg size's classes", () => {
    render(<Button size="lg">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("px-7", "rounded-xl");
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
