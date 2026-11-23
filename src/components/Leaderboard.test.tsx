/**
 * src/components/Leaderboard.test.tsx
 *
 * Unit tests for Leaderboard's copy-address control.
 *
 * The fetch/abort/refetch machinery here is the same useAbortableRequest hook
 * covered directly in hooks/useAbortableRequest.test.ts, and the clipboard
 * fallback chain itself is covered in lib/clipboard.test.ts and
 * hooks/useCopyToClipboard.test.ts — this file only exercises what is unique
 * to Leaderboard: that each row wires a supporter's *full* address into that
 * existing hook, behind a control with an accessible name that confirms the
 * outcome.
 *
 * Covers:
 *   - Each supporter row renders a copy control with the full address in its
 *     accessible name
 *   - Clicking it copies the full (not shortened) address via useCopyToClipboard
 *   - A successful copy is confirmed through the control's accessible name
 *   - A failed copy is confirmed (differently) through the accessible name too
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Leaderboard } from "./Leaderboard";
import * as clipboard from "@/lib/clipboard";

const topSupporters = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  analyticsApi: { topSupporters },
}));

const ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";

function withOneSupporter() {
  return {
    supporters: [{ fromAddress: ADDRESS, tipCount: 3, totalAmountRaw: "50000000" }],
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Leaderboard – copy address control", () => {
  it("copies the supporter's full address and confirms success in the accessible name", async () => {
    topSupporters.mockResolvedValue(withOneSupporter());
    vi.spyOn(clipboard, "copyText").mockResolvedValue(true);
    const user = userEvent.setup();

    render(<Leaderboard jwt="jwt" />);

    const button = await screen.findByRole("button", {
      name: `Copy full address ${ADDRESS}`,
    });
    await user.click(button);

    expect(clipboard.copyText).toHaveBeenCalledWith(ADDRESS);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Full address copied" })).toBeInTheDocument(),
    );
  });

  it("confirms a failed copy through the accessible name instead of failing silently", async () => {
    topSupporters.mockResolvedValue(withOneSupporter());
    vi.spyOn(clipboard, "copyText").mockResolvedValue(false);
    const user = userEvent.setup();

    render(<Leaderboard jwt="jwt" />);

    const button = await screen.findByRole("button", {
      name: `Copy full address ${ADDRESS}`,
    });
    await user.click(button);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Couldn't copy address — try again" }),
      ).toBeInTheDocument(),
    );
  });
});
