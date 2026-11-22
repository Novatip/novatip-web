/**
 * src/components/Footer.test.tsx
 *
 * Tests for the project-links footer.
 *
 * The hrefs are asserted as literal URLs on purpose: they are the whole point
 * of the component, so a typo or a changed destination should fail here rather
 * than pass because the test imported the same constant.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Footer } from "./Footer";

afterEach(cleanup);

const EXPECTED_LINKS = [
  { name: /^GitHub/, href: "https://github.com/Novatip" },
  { name: /^Docs/, href: "https://novatip-docs.pages.dev" },
  {
    name: /^Security policy/,
    href: "https://github.com/Novatip/novatip-docs/blob/main/SECURITY.md",
  },
];

describe("Footer", () => {
  it("renders a contentinfo landmark with a labelled project-links nav", () => {
    render(<Footer />);

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("navigation", { name: "Project links" }),
    ).toBeInTheDocument();
  });

  it.each(EXPECTED_LINKS)("links to $href", ({ name, href }) => {
    render(<Footer />);

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  });

  it("renders exactly the three project links", () => {
    render(<Footer />);

    expect(screen.getAllByRole("link")).toHaveLength(EXPECTED_LINKS.length);
  });

  it('opens every external link with rel="noopener noreferrer"', () => {
    render(<Footer />);

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("tells screen readers that each link opens in a new tab", () => {
    render(<Footer />);

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
    }
  });

  it("reaches every link with the Tab key, in reading order", async () => {
    const user = userEvent.setup();
    render(<Footer />);

    for (const { name } of EXPECTED_LINKS) {
      await user.tab();
      expect(screen.getByRole("link", { name })).toHaveFocus();
    }
  });
});
