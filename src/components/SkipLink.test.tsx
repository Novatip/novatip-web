/**
 * src/components/SkipLink.test.tsx
 *
 * Tests for the first focusable element on every page.
 *
 * A skip link fails silently: if its href points somewhere that does not exist
 * the browser simply does nothing, and if it is not first in the tab order it
 * is never reached by the person who needs it. Both are covered here, along
 * with the accessible name that tells a screen reader what it does.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkipLink } from "./SkipLink";

afterEach(cleanup);

describe("SkipLink", () => {
  it("targets #main-content and that target exists in the page", () => {
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          Content
        </main>
      </>,
    );

    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link).toHaveAttribute("href", "#main-content");
    expect(document.querySelector(link.getAttribute("href")!)).toBeInTheDocument();
  });

  it("is the first element reached by Tab", async () => {
    const user = userEvent.setup();

    // Mirrors the root layout: SkipLink is rendered before the page chrome
    // and content, so a keyboard user meets it before the header links.
    render(
      <>
        <SkipLink />
        <header>
          <button type="button">Novatip</button>
          <button type="button">Create a tip jar</button>
        </header>
        <main id="main-content" tabIndex={-1}>
          Content
        </main>
      </>,
    );

    await user.tab();

    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveFocus();
  });

  it("has an accessible name that explains its destination", () => {
    render(<SkipLink />);

    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toBeInTheDocument();
  });
});
