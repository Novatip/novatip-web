/**
 * src/components/Avatar.test.tsx
 *
 * Unit tests for Avatar and its pure getInitials helper.
 *
 * Covers:
 *   - getInitials for one-word, two-word, empty and @-prefixed names
 *   - The no-src fallback
 *   - The onError fallback when a real image fails to load
 *   - The error resetting when src changes, so a new image gets a chance
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Avatar, getInitials } from "./Avatar";

afterEach(cleanup);

const FIRST_SRC = "https://example.com/alice.png";
const SECOND_SRC = "https://example.com/alice-2.png";

// ── getInitials ───────────────────────────────────────────────────────────────

describe("getInitials", () => {
  it("uses the first letters of a two-word name", () => {
    expect(getInitials("Alice Smith")).toBe("AS");
  });

  it("uses the first letters of the first two words of a longer name", () => {
    expect(getInitials("Alice  Beatrice Smith")).toBe("AB");
  });

  it("uses the first two letters of a one-word name", () => {
    expect(getInitials("Alice")).toBe("AL");
  });

  it("strips a leading @ before taking initials", () => {
    expect(getInitials("@alice")).toBe("AL");
    expect(getInitials("  @alice  ")).toBe("AL");
  });

  it("falls back to the slug when the display name is empty", () => {
    expect(getInitials("", "alice")).toBe("AL");
    expect(getInitials("   ", "bob")).toBe("BO");
  });

  it("falls back to ? when both the name and slug are empty", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ", "")).toBe("?");
  });
});

// ── Avatar fallback rendering ─────────────────────────────────────────────────

describe("Avatar", () => {
  it("renders local initials when there is no src", () => {
    render(<Avatar displayName="Alice Smith" slug="alice" />);

    expect(
      screen.getByLabelText("Alice Smith avatar fallback"),
    ).toBeInTheDocument();
    expect(screen.getByText("AS")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the image when src is present", () => {
    render(<Avatar src={FIRST_SRC} displayName="Alice Smith" slug="alice" />);

    expect(
      screen.getByRole("img", { name: "Alice Smith avatar" }),
    ).toHaveAttribute("src", FIRST_SRC);
    expect(
      screen.queryByLabelText("Alice Smith avatar fallback"),
    ).not.toBeInTheDocument();
  });

  it("falls back to initials when the image fails to load", () => {
    render(<Avatar src={FIRST_SRC} displayName="Alice Smith" slug="alice" />);

    fireEvent.error(screen.getByRole("img", { name: "Alice Smith avatar" }));

    expect(
      screen.getByLabelText("Alice Smith avatar fallback"),
    ).toBeInTheDocument();
    expect(screen.getByText("AS")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("resets the error when src changes so the new image is attempted", () => {
    const { rerender } = render(
      <Avatar src={FIRST_SRC} displayName="Alice Smith" slug="alice" />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Alice Smith avatar" }));
    expect(
      screen.getByLabelText("Alice Smith avatar fallback"),
    ).toBeInTheDocument();

    rerender(
      <Avatar src={SECOND_SRC} displayName="Alice Smith" slug="alice" />,
    );

    expect(
      screen.getByRole("img", { name: "Alice Smith avatar" }),
    ).toHaveAttribute("src", SECOND_SRC);
    expect(
      screen.queryByLabelText("Alice Smith avatar fallback"),
    ).not.toBeInTheDocument();
  });
});
