/**
 * src/components/RecentTips.test.ts
 *
 * Unit tests for the pure helpers exported from RecentTips.
 *
 * The matching rule decides whether a supporter sees their tip appear,
 * duplicate, or vanish, so it is worth pinning precisely. An earlier version
 * matched on the sender alone, which meant any returning supporter's optimistic
 * row was cleared by one of their *older* tips on the very next poll — the tip
 * looked lost. Both fields are now required, and the test below for a repeat
 * supporter is what stops that regressing.
 *
 * Covers:
 *   - isMatch: same sender and a sufficient amount
 *   - isMatch: same sender but too small an amount is not a match
 *   - isMatch: a different sender is never a match
 *   - mergeWithPending: a confirmed entry is dropped
 *   - mergeWithPending: a repeat supporter's new entry survives their old tip
 *   - mergeWithPending: an expired entry is downgraded to unconfirmed
 */

import { describe, it, expect } from "vitest";
import {
  isMatch,
  mergeWithPending,
  type IndexedTip,
  type PendingTip,
} from "./RecentTips";

const ADDRESS = "GD7UXR3IX276M2M4XUE3TPNKTA7PJTERTEDEGWELQQYQBBHDL2NTREFR";
const OTHER = "GDE6TLQE77OGAPXORP5G5YLRG4FQE2D7ZCD237LVLTAALXAOVV3YTPDS";

function indexedTip(over: Partial<IndexedTip> = {}): IndexedTip {
  return {
    kind: "indexed",
    id: "tip-1",
    fromAddress: ADDRESS,
    amount: "20000000", // 2 USDC in stroops
    message: "",
    ledgerAt: "2026-10-01T00:00:00Z",
    ...over,
  };
}

function pendingTip(over: Partial<PendingTip> = {}): PendingTip {
  return {
    kind: "pending",
    id: "pending-1",
    fromAddress: ADDRESS,
    displayAmount: "2",
    message: "",
    expiresAt: Date.now() + 30_000,
    ...over,
  };
}

describe("isMatch", () => {
  it("matches the same sender when the indexed amount covers the pending one", () => {
    expect(isMatch(indexedTip(), pendingTip())).toBe(true);
  });

  it("does not match when the indexed amount is below the pending one", () => {
    expect(isMatch(indexedTip({ amount: "10000000" }), pendingTip({ displayAmount: "2" }))).toBe(
      false,
    );
  });

  it("never matches a different sender", () => {
    expect(isMatch(indexedTip({ fromAddress: OTHER }), pendingTip())).toBe(false);
  });

  it("does not match on an unparseable indexed amount", () => {
    expect(isMatch(indexedTip({ amount: "not-a-number" }), pendingTip())).toBe(false);
  });
});

describe("mergeWithPending", () => {
  it("drops a pending entry once its indexed counterpart arrives", () => {
    const feed = mergeWithPending([indexedTip()], [pendingTip()]);

    expect(feed).toHaveLength(1);
    expect(feed[0]!.kind).toBe("indexed");
  });

  it("keeps a repeat supporter's new entry despite an older tip of theirs", () => {
    // Same sender, but the indexed tip is an earlier, smaller one. Matching on
    // the address alone would wrongly clear the new pending entry here.
    const older = indexedTip({ id: "tip-old", amount: "5000000" }); // 0.50 USDC
    const pending = pendingTip({ displayAmount: "2" });

    const feed = mergeWithPending([older], [pending]);

    expect(feed).toHaveLength(2);
    expect(feed[0]!.kind).toBe("pending");
  });

  it("downgrades a pending entry to unconfirmed once its window elapses", () => {
    const pending = pendingTip({ expiresAt: 1_000 });

    const feed = mergeWithPending([], [pending], 2_000);

    expect(feed).toHaveLength(1);
    expect(feed[0]!.kind).toBe("unconfirmed");
  });

  it("puts still-confirming entries ahead of unconfirmed and indexed ones", () => {
    const confirming = pendingTip({ id: "p-live", expiresAt: 10_000 });
    const expired = pendingTip({ id: "p-dead", displayAmount: "7", expiresAt: 1_000 });

    const feed = mergeWithPending([indexedTip({ amount: "1" })], [confirming, expired], 5_000);

    expect(feed.map((e) => e.kind)).toEqual(["pending", "unconfirmed", "indexed"]);
  });
});
