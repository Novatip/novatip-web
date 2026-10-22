/**
 * src/components/ui/LinkButton.test.tsx
 *
 * Unit tests for LinkButton component.
 *
 * The point of LinkButton is to render one interactive element with the same
 * look as Button. It replaces <Link><Button /></Link> nestings, which render
 * an anchor containing a button (invalid HTML, two keyboard tab stops for one
 * action).
 *
 * Covers:
 *   - Renders as an anchor (interactive element is a link, not a button)
 *   - Passes through the href prop to the anchor
 *   - Supports all variant styles: primary, secondary, ghost, danger
 *   - Supports all size styles: sm, md, lg
 *   - Default variant is primary
 *   - Default size is md
 *   - Applies custom className in addition to style classes
 *   - Renders children content
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LinkButton } from "./LinkButton";

afterEach(cleanup);

// ── Basic rendering ───────────────────────────────────────────────────────────

describe("LinkButton", () => {
  it("renders as an anchor element", () => {
    render(<LinkButton href="/test">Click me</LinkButton>);

    const link = screen.getByRole("link", { name: /click me/i });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
  });

  it("passes the href prop to the anchor", () => {
    render(<LinkButton href="/onboarding">Create jar</LinkButton>);

    expect(screen.getByRole("link", { name: /create jar/i })).toHaveAttribute(
      "href",
      "/onboarding",
    );
  });

  it("renders children content", () => {
    render(<LinkButton href="/">Click me</LinkButton>);

    expect(screen.getByText(/click me/i)).toBeInTheDocument();
  });

  it("renders children as JSX elements", () => {
    render(
      <LinkButton href="/">
        <span>Icon</span>
        <span>Text</span>
      </LinkButton>,
    );

    expect(screen.getByText(/icon/i)).toBeInTheDocument();
    expect(screen.getByText(/text/i)).toBeInTheDocument();
  });

  // ── Variants ───────────────────────────────────────────────────────────────

  it("applies primary variant by default", () => {
    render(<LinkButton href="/">Default</LinkButton>);

    const link = screen.getByRole("link");
    expect(link).toHaveClass("bg-brand-500");
    expect(link).toHaveClass("text-white");
  });

  it("applies primary variant when explicitly set", () => {
    render(
      <LinkButton href="/" variant="primary">
        Primary
      </LinkButton>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("bg-brand-500");
  });

  it("applies secondary variant", () => {
    render(
      <LinkButton href="/" variant="secondary">
        Secondary
      </LinkButton>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("bg-surface-strong");
    expect(link).toHaveClass("border");
  });

  it("applies ghost variant", () => {
    render(
      <LinkButton href="/" variant="ghost">
        Ghost
      </LinkButton>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("hover:bg-surface-strong");
    expect(link).toHaveClass("text-fg-muted");
  });

  it("applies danger variant", () => {
    render(
      <LinkButton href="/" variant="danger">
        Danger
      </LinkButton>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("bg-danger/20");
    expect(link).toHaveClass("text-danger");
  });

  // ── Sizes ──────────────────────────────────────────────────────────────────

  it("applies md size by default", () => {
    render(<LinkButton href="/">Default</LinkButton>);

    const link = screen.getByRole("link");
    expect(link).toHaveClass("px-5");
    expect(link).toHaveClass("py-2.5");
    expect(link).toHaveClass("text-sm");
  });

  it("applies sm size", () => {
    render(
      <LinkButton href="/" size="sm">
        Small
      </LinkButton>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("px-3");
    expect(link).toHaveClass("py-1.5");
    expect(link).toHaveClass("text-sm");
  });

  it("applies md size when explicitly set", () => {
    render(
      <LinkButton href="/" size="md">
        Medium
      </LinkButton>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("px-5");
    expect(link).toHaveClass("py-2.5");
  });

  it("applies lg size", () => {
    render(
      <LinkButton href="/" size="lg">
        Large
      </LinkButton>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("px-7");
    expect(link).toHaveClass("py-3.5");
    expect(link).toHaveClass("text-base");
  });

  // ── Custom className ──────────────────────────────────────────────────────

  it("merges custom className with style classes", () => {
    render(
      <LinkButton href="/" className="custom-class">
        Styled
      </LinkButton>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("custom-class");
    expect(link).toHaveClass("bg-brand-500");
    expect(link).toHaveClass("px-5");
  });

  // ── Focus styles ───────────────────────────────────────────────────────────

  it("has focus ring styles for accessibility", () => {
    render(<LinkButton href="/">Focusable</LinkButton>);

    const link = screen.getByRole("link");
    expect(link).toHaveClass("focus:outline-none");
    expect(link).toHaveClass("focus:ring-2");
    expect(link).toHaveClass("focus:ring-brand-500/50");
  });

  // ── Common styles ──────────────────────────────────────────────────────────

  it("applies common layout and transition styles", () => {
    render(<LinkButton href="/">Button</LinkButton>);

    const link = screen.getByRole("link");
    expect(link).toHaveClass("inline-flex");
    expect(link).toHaveClass("items-center");
    expect(link).toHaveClass("justify-center");
    expect(link).toHaveClass("font-medium");
    expect(link).toHaveClass("transition-all");
    expect(link).toHaveClass("duration-200");
  });

  // ── Combinations ───────────────────────────────────────────────────────────

  it("combines variant and size props", () => {
    render(
      <LinkButton href="/" variant="secondary" size="lg">
        Action
      </LinkButton>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("bg-surface-strong");
    expect(link).toHaveClass("px-7");
    expect(link).toHaveClass("py-3.5");
  });

  it("passes through other Link props", () => {
    render(
      <LinkButton href="/" title="Tooltip text">
        Link
      </LinkButton>,
    );

    expect(screen.getByRole("link")).toHaveAttribute("title", "Tooltip text");
  });
});
