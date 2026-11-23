/**
 * src/components/ui/Card.test.tsx
 *
 * Unit tests for Card, CardHeader and CardTitle.
 *
 * Covers:
 *   - Ref forwarding reaches the underlying <div> — TipSuccess depends on
 *     this to move focus to the success card, which is what announces a
 *     completed tip to a screen reader. If forwarding regresses, focus
 *     silently stops moving and nothing throws.
 *   - glass={true} (the default) applies the glass style, not the solid one
 *   - glass={false} applies the solid surface/border style, not glass
 *   - CardHeader renders its children
 *   - CardTitle renders its children
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { createRef } from "react";
import { Card, CardHeader, CardTitle } from "./Card";

afterEach(cleanup);

// ── Ref forwarding ────────────────────────────────────────────────────────────

describe("Card – ref forwarding", () => {
  it("attaches the ref to the underlying div element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>Content</Card>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("DIV");
  });

  it("ref points to the same node as the rendered card", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>Content</Card>);
    expect(ref.current).toBe(screen.getByText("Content"));
  });

  it("lets a caller programmatically focus the card via the ref, as TipSuccess does", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Card ref={ref} tabIndex={-1}>
        Content
      </Card>,
    );
    ref.current?.focus();
    expect(ref.current).toHaveFocus();
  });
});

// ── glass prop ────────────────────────────────────────────────────────────────

describe("Card – glass style", () => {
  it("applies the glass class by default", () => {
    render(<Card>Content</Card>);
    expect(screen.getByText("Content")).toHaveClass("glass");
  });

  it("applies the glass class when glass is explicitly true", () => {
    render(<Card glass>Content</Card>);
    const card = screen.getByText("Content");
    expect(card).toHaveClass("glass");
    expect(card).not.toHaveClass("bg-surface");
  });

  it("applies the solid surface/border style instead of glass when glass is false", () => {
    render(<Card glass={false}>Content</Card>);
    const card = screen.getByText("Content");
    expect(card).toHaveClass("bg-surface", "border", "border-hairline");
    expect(card).not.toHaveClass("glass");
  });
});

// ── CardHeader / CardTitle ────────────────────────────────────────────────────

describe("CardHeader", () => {
  it("renders its children", () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });
});

describe("CardTitle", () => {
  it("renders its children", () => {
    render(<CardTitle>Title text</CardTitle>);
    expect(screen.getByText("Title text")).toBeInTheDocument();
  });

  it("renders as an h3 by default", () => {
    render(<CardTitle>Title text</CardTitle>);
    expect(screen.getByRole("heading", { level: 3, name: "Title text" })).toBeInTheDocument();
  });

  it("renders at the requested heading level", () => {
    render(<CardTitle level={2}>Title text</CardTitle>);
    expect(screen.getByRole("heading", { level: 2, name: "Title text" })).toBeInTheDocument();
  });
});
