/**
 * src/components/ui/Badge.test.tsx
 *
 * Unit tests for Badge.
 *
 * Covers:
 *   - Each of the five variants renders its expected classes
 *   - An unknown variant key does not render "undefined" into the class list
 *   - Children are rendered
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Badge } from "./Badge";

afterEach(cleanup);

// ── Variants ──────────────────────────────────────────────────────────────────

describe("Badge – variants", () => {
  it("applies the default variant's classes", () => {
    render(<Badge variant="default">Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass("bg-surface-strong", "text-fg-muted");
  });

  it("applies the success variant's classes", () => {
    render(<Badge variant="success">Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass(
      "bg-success/20",
      "text-success",
      "border",
      "border-success/30",
    );
  });

  it("applies the warning variant's classes", () => {
    render(<Badge variant="warning">Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass(
      "bg-warning/20",
      "text-warning",
      "border",
      "border-warning/30",
    );
  });

  it("applies the error variant's classes", () => {
    render(<Badge variant="error">Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass(
      "bg-danger/20",
      "text-danger",
      "border",
      "border-danger/30",
    );
  });

  it("applies the usdc variant's theme-aware token classes", () => {
    render(<Badge variant="usdc">Label</Badge>);
    const badge = screen.getByText("Label");
    expect(badge).toHaveClass(
      "bg-usdc/20",
      "text-usdc-fg",
      "border",
      "border-usdc-border/30",
    );
    // No raw palette classes — dark values come from the tokens.
    expect(badge.className).not.toMatch(/blue-\d+/);
  });

  it("defaults to the default variant when none is given", () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass("bg-surface-strong", "text-fg-muted");
  });
});

// ── Unknown variant safety ────────────────────────────────────────────────────

describe("Badge – unknown variant", () => {
  it("does not render the literal string 'undefined' into the class list", () => {
    // Bypasses the BadgeVariant type on purpose — this is exactly the
    // mistyped-key scenario a lookup miss produces at runtime (e.g. a value
    // threaded through from untyped data), which the type system alone
    // can't catch at every call site.
    render(<Badge variant={"not-a-real-variant" as unknown as never}>Label</Badge>);
    const badge = screen.getByText("Label");
    expect(badge.className).not.toMatch(/undefined/);
  });

  it("still renders its base pill classes and children for an unknown variant", () => {
    render(<Badge variant={"not-a-real-variant" as unknown as never}>Label</Badge>);
    const badge = screen.getByText("Label");
    expect(badge).toHaveClass("inline-flex", "rounded-full");
    expect(badge).toHaveTextContent("Label");
  });
});

// ── Children ──────────────────────────────────────────────────────────────────

describe("Badge – children", () => {
  it("renders text children", () => {
    render(<Badge>100%</Badge>);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders element children", () => {
    render(
      <Badge>
        <span data-testid="inner">🥇</span>
      </Badge>,
    );
    expect(screen.getByTestId("inner")).toBeInTheDocument();
  });
});
