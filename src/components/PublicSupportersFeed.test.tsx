/**
 * src/components/PublicSupportersFeed.test.tsx
 *
 * Behavioural tests for the public tip page's social-proof section.
 *
 * Three rules matter here, and all three are easy to break silently because
 * nothing errors when they regress:
 *
 *   - an empty list renders no card at all, rather than an empty
 *     "Recent Supporters" heading that reads as a broken page
 *   - a populated row shows the amount, a shortened address and the message
 *   - a tip with no message omits the quote instead of rendering empty marks
 *
 * The feed is rendered server-side with data resolved alongside the creator
 * profile, so there is no fetch to mock: the props are the entire input.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PublicSupportersFeed } from "./PublicSupportersFeed";
import type { PublicTip } from "@/lib/api";

const SUPPORTER_A = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";
const SUPPORTER_B = "GXYZ9876543210ABCDEFGHIJKLMNOPQRSTUVWXYZ0987654321ABCD";

function makeTip(overrides: Partial<PublicTip> = {}): PublicTip {
  return {
    id: "tip-1",
    fromAddress: SUPPORTER_A,
    amount: "50000000", // 5 USDC in stroops
    message: "Great work!",
    ledgerAt: "2026-10-19T12:00:00Z",
    ...overrides,
  };
}

afterEach(cleanup);

describe("PublicSupportersFeed – empty list", () => {
  it("renders nothing at all when there are no tips", () => {
    const { container } = render(<PublicSupportersFeed tips={[]} />);

    // Not a card with an empty state: an empty "Recent Supporters" section
    // is evidence of a bug to a visitor, not evidence of no support.
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Recent Supporters")).not.toBeInTheDocument();
  });
});

describe("PublicSupportersFeed – populated list", () => {
  it("shows the amount, shortened address and message for each tip", () => {
    render(
      <PublicSupportersFeed
        tips={[
          makeTip(),
          makeTip({
            id: "tip-2",
            fromAddress: SUPPORTER_B,
            amount: "12500000", // 1.25 USDC
            message: "Keep building",
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Recent Supporters" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Recent supporters" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    // Amounts are stroops rendered as USDC, not raw integers.
    expect(screen.getByText("$5.00 USDC")).toBeInTheDocument();
    expect(screen.getByText("$1.25 USDC")).toBeInTheDocument();

    // Addresses are shortened for display but still identify the supporter.
    expect(screen.getByText("GABC…OPQR")).toBeInTheDocument();
    expect(screen.getByText("GXYZ…ABCD")).toBeInTheDocument();

    // The message is part of the row, not just an optional extra that is
    // always dropped.
    expect(screen.getByText(/Great work!/)).toBeInTheDocument();
    expect(screen.getByText(/Keep building/)).toBeInTheDocument();
  });

  it("renders no quote for a tip without a message", () => {
    const { container } = render(
      <PublicSupportersFeed
        tips={[makeTip({ message: "" })]}
      />,
    );

    // The row itself is still rendered — a silent supporter is still a
    // supporter.
    expect(screen.getByText("GABC…OPQR")).toBeInTheDocument();
    expect(screen.getByText("$5.00 USDC")).toBeInTheDocument();

    // No stray opening/closing quote marks left behind by an empty message.
    expect(container.textContent).not.toMatch(/[“”]/);
  });
});

describe("PublicSupportersFeed – malformed amounts", () => {
  it("skips a tip with an unparseable amount while rendering the rest of the list", () => {
    render(
      <PublicSupportersFeed
        tips={[
          makeTip({ id: "tip-good-1", amount: "50000000" }),
          makeTip({ id: "tip-bad", amount: "not-a-number", fromAddress: SUPPORTER_B }),
          makeTip({ id: "tip-good-2", amount: "12500000", fromAddress: SUPPORTER_B, message: "" }),
        ]}
      />,
    );

    // The valid tips are still shown.
    expect(screen.getByText("$5.00 USDC")).toBeInTheDocument();
    expect(screen.getByText("$1.25 USDC")).toBeInTheDocument();

    // Only the two valid rows are in the list — the bad one is skipped.
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
