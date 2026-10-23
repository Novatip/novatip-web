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

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SplitBreakdown } from "./SplitBreakdown";

afterEach(cleanup);

// Mock the wallet context
const mockWallet = { publicKey: null, isConnected: false };
vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => mockWallet,
}));

// Mock config for explorer URLs
const mockConfig = vi.hoisted(() => ({
  stellar: {
    network: "testnet" as "testnet" | "mainnet" | "local",
  },
}));

vi.mock("@/lib/config", async () => {
  const actual = await vi.importActual("@/lib/config");
  return {
    ...actual,
    config: mockConfig,
  };
});

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

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

  it("marks your own address with a 'You' label when wallet is connected", () => {
    mockWallet.publicKey = CREATOR;
    mockWallet.isConnected = true;

    render(
      <SplitBreakdown
        splits={[
          { to: CREATOR, bps: 7000 },
          { to: COLLAB, bps: 3000 },
        ]}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("You");
    expect(rows[1]).not.toHaveTextContent("You");

    // Reset for other tests
    mockWallet.publicKey = null;
    mockWallet.isConnected = false;
  });

  it("does not show 'You' label when wallet is not connected", () => {
    mockWallet.publicKey = null;
    mockWallet.isConnected = false;

    render(
      <SplitBreakdown
        splits={[
          { to: CREATOR, bps: 7000 },
          { to: COLLAB, bps: 3000 },
        ]}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).not.toHaveTextContent("You");
    expect(rows[1]).not.toHaveTextContent("You");
  });

  it("links addresses to the stellar explorer on testnet", () => {
    mockConfig.stellar.network = "testnet";

    render(
      <SplitBreakdown
        splits={[
          { to: CREATOR, bps: 7000 },
          { to: COLLAB, bps: 3000 },
        ]}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/account/${CREATOR}`,
    );
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
    expect(links[1]).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/account/${COLLAB}`,
    );
  });

  it("links addresses to the stellar explorer on mainnet", () => {
    mockConfig.stellar.network = "mainnet";

    render(
      <SplitBreakdown
        splits={[
          { to: CREATOR, bps: 10000 },
        ]}
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/public/account/${CREATOR}`,
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    // Reset for other tests
    mockConfig.stellar.network = "testnet";
  });

  it("has a copy control for each address", () => {
    render(
      <SplitBreakdown
        splits={[
          { to: CREATOR, bps: 7000 },
          { to: COLLAB, bps: 3000 },
        ]}
      />,
    );

    const copyButtons = screen.getAllByRole("button");
    expect(copyButtons).toHaveLength(2);
    expect(copyButtons[0]).toHaveAccessibleName(`Copy full address ${CREATOR}`);
    expect(copyButtons[1]).toHaveAccessibleName(`Copy full address ${COLLAB}`);
  });

  it("copies the full address when the copy button is clicked", async () => {
    const user = userEvent.setup();
    mockClipboard.writeText.mockResolvedValue(undefined);

    render(
      <SplitBreakdown
        splits={[
          { to: CREATOR, bps: 10000 },
        ]}
      />,
    );

    const copyButton = screen.getByRole("button", { name: `Copy full address ${CREATOR}` });
    await user.click(copyButton);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(CREATOR);
    expect(copyButton).toHaveAccessibleName("Full address copied");
  });

  it("shows an error state when copy fails", async () => {
    const user = userEvent.setup();
    mockClipboard.writeText.mockRejectedValue(new Error("Clipboard denied"));

    render(
      <SplitBreakdown
        splits={[
          { to: CREATOR, bps: 10000 },
        ]}
      />,
    );

    const copyButton = screen.getByRole("button", { name: `Copy full address ${CREATOR}` });
    await user.click(copyButton);

    expect(copyButton).toHaveAccessibleName("Couldn't copy address — try again");
  });
});
