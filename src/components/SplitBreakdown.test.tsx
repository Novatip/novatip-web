/**
 * src/components/SplitBreakdown.test.tsx
 *
 * Tests for the public split breakdown — the list a supporter reads before
 * signing a tip.
 *
 * The three things a supporter relies on are that every recipient appears,
 * each address is recognisable in shortened form, and the percentages add up
 * to what the contract will actually pay. All three are pinned here, plus the
 * single-recipient jar (the common case) which must read as 100%, not as an
 * empty or missing list.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SplitBreakdown } from "./SplitBreakdown";

afterEach(cleanup);

// Both are 56-character Stellar addresses, so shortenAddress has something to
// shorten rather than returning them unchanged.
const CREATOR = "GBOUUKWI3SUIIL75NEZMVYLYU77SIXNN2RNYMNJOJX6WXOICMMAKKKB4";
const COLLAB = "GBASZB2BGT6WYIQ57PSXBNLK5PUH5W3ASRUS4DZHHHJW3YQ5ZWGASJJ5";

describe("SplitBreakdown", () => {
  it("renders one row per split", () => {
    render(
      <SplitBreakdown
        splits={[
          { to: CREATOR, bps: 7000 },
          { to: COLLAB, bps: 3000 },
        ]}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shortens both addresses and prints each share for a two-way split", () => {
    render(
      <SplitBreakdown
        splits={[
          { to: CREATOR, bps: 7000 },
          { to: COLLAB, bps: 3000 },
        ]}
      />,
    );

    const rows = screen.getAllByRole("listitem");

    expect(rows[0]).toHaveTextContent("GBOU…KKB4");
    expect(rows[0]).toHaveTextContent("70%");

    expect(rows[1]).toHaveTextContent("GBAS…SJJ5");
    expect(rows[1]).toHaveTextContent("30%");
  });

  it("shows a single-recipient jar as one row at 100%", () => {
    render(<SplitBreakdown splits={[{ to: CREATOR, bps: 10000 }]} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("GBOU…KKB4");
    expect(rows[0]).toHaveTextContent("100%");
  });

  it("labels the list for assistive technology", () => {
    render(<SplitBreakdown splits={[{ to: CREATOR, bps: 10000 }]} />);

    expect(
      screen.getByRole("list", { name: "Split breakdown" }),
    ).toBeInTheDocument();
  });
});
