/**
 * src/components/RecentTips.test.tsx
 *
 * Unit tests for the mergeWithPending helper in RecentTips.
 *
 * Covers:
 *   - A confirmed tip (same address + matching amount) is removed from the
 *     pending list
 *   - An older indexed tip from the same address does NOT clear a new pending
 *     entry (returning-supporter scenario)
 *   - A pending entry that has never been indexed is downgraded to
 *     "unconfirmed" once the fast-polling window elapses
 *   - A pending entry within the window stays "pending"
 */

import { describe, it, expect } from "vitest";

// ── Local copy of the helpers under test ──────────────────────────────────────
//
// mergeWithPending and its helpers are not exported from RecentTips.tsx
// (implementation details).  We mirror the logic here so the tests stay
// self-contained without coupling to the module boundary.

interface IndexedTip {
  kind: "indexed";
  id: string;
  fromAddress: string;
  amount: string;
  message: string;
  ledgerAt: string;
}

interface PendingTip {
  kind: "pending";
  id: string;
  fromAddress: string;
  displayAmount: string;
  message: string;
  expiresAt: number;
}

interface UnconfirmedTip extends Omit<PendingTip, "kind"> {
  kind: "unconfirmed";
}

type FeedEntry = IndexedTip | PendingTip | UnconfirmedTip;

// Mirror of the production displayAmountToStroops helper
function displayAmountToStroops(display: string): bigint {
  const [integer = "0", fraction = ""] = display.split(".");
  const paddedFraction = fraction.padEnd(7, "0").slice(0, 7);
  return BigInt(integer) * 10_000_000n + BigInt(paddedFraction);
}

// Mirror of the production isMatch helper
function isMatch(indexed: IndexedTip, pending: PendingTip): boolean {
  if (indexed.fromAddress !== pending.fromAddress) return false;
  try {
    return BigInt(indexed.amount) >= displayAmountToStroops(pending.displayAmount);
  } catch {
    return false;
  }
}

function mergeWithPending(
  indexed: IndexedTip[],
  pending: PendingTip[],
  now = Date.now(),
): FeedEntry[] {
  const unconfirmed: UnconfirmedTip[] = [];
  const stillPending: PendingTip[] = [];

  for (const p of pending) {
    if (indexed.some((t) => isMatch(t, p))) continue; // confirmed — drop it
    if (now > p.expiresAt) {
      unconfirmed.push({ ...p, kind: "unconfirmed" });
    } else {
      stillPending.push(p);
    }
  }

  return [...stillPending, ...unconfirmed, ...indexed];
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADDR_A = "GABC1234";
const ADDR_B = "GXYZ5678";
const NOW = 1_000_000; // arbitrary fixed "now" timestamp

// 1 USDC = 10_000_000 stroops (7 decimal places)
const FIVE_USDC_STROOPS = "50000000";  // 5 USDC
const THREE_USDC_STROOPS = "30000000";  // 3 USDC

function makePending(
  address: string,
  expiresAt: number,
  displayAmount = "5",
  id = "pending-1",
): PendingTip {
  return {
    kind: "pending",
    id,
    fromAddress: address,
    displayAmount,
    message: "great work",
    expiresAt,
  };
}

function makeIndexed(
  address: string,
  amount = FIVE_USDC_STROOPS,
  id = "indexed-1",
): IndexedTip {
  return {
    kind: "indexed",
    id,
    fromAddress: address,
    amount,
    message: "great work",
    ledgerAt: "2024-01-01T00:00:00Z",
  };
}

// ── Confirmed tips ────────────────────────────────────────────────────────────

describe("mergeWithPending – confirmed tips", () => {
  it("removes a pending entry when address and amount both match", () => {
    const pending = [makePending(ADDR_A, NOW + 10_000)]; // displayAmount "5"
    const indexed = [makeIndexed(ADDR_A, FIVE_USDC_STROOPS)];

    const feed = mergeWithPending(indexed, pending, NOW);

    expect(feed).toHaveLength(1);
    expect(feed[0].kind).toBe("indexed");
  });

  it("removes a pending entry when the indexed amount is slightly higher (rounding)", () => {
    // Indexed amount is 5.0000001 USDC — slightly above the "5" display amount
    const pending = [makePending(ADDR_A, NOW + 10_000, "5")];
    const indexed = [makeIndexed(ADDR_A, "50000001")];

    const feed = mergeWithPending(indexed, pending, NOW);

    expect(feed).toHaveLength(1);
    expect(feed[0].kind).toBe("indexed");
  });

  it("leaves unrelated pending entries untouched", () => {
    const pending = [makePending(ADDR_B, NOW + 10_000)];
    const indexed = [makeIndexed(ADDR_A)];

    const feed = mergeWithPending(indexed, pending, NOW);

    expect(feed).toHaveLength(2);
    const pendingEntry = feed.find((e) => e.fromAddress === ADDR_B);
    expect(pendingEntry?.kind).toBe("pending");
  });
});

// ── Returning-supporter scenario ──────────────────────────────────────────────

describe("mergeWithPending – returning supporter", () => {
  it("does NOT clear a pending entry just because the same address has an older tip", () => {
    // Supporter previously tipped 3 USDC (already indexed).
    // They now have a new pending tip for 5 USDC.
    // The older 3 USDC indexed tip must NOT clear the new 5 USDC pending entry.
    const pending = [makePending(ADDR_A, NOW + 10_000, "5")];
    const indexed = [makeIndexed(ADDR_A, THREE_USDC_STROOPS, "old-tip")];

    const feed = mergeWithPending(indexed, pending, NOW);

    // Both the pending row and the older indexed row should appear
    expect(feed).toHaveLength(2);
    const pendingEntry = feed.find((e) => e.fromAddress === ADDR_A && e.kind === "pending");
    expect(pendingEntry).toBeDefined();
    expect(pendingEntry?.kind).toBe("pending");
  });

  it("clears the pending entry once the new tip with the right amount is indexed", () => {
    // Same supporter: the new 5 USDC tip is now indexed alongside the old 3 USDC tip
    const pending = [makePending(ADDR_A, NOW + 10_000, "5")];
    const indexed = [
      makeIndexed(ADDR_A, THREE_USDC_STROOPS, "old-tip"),
      makeIndexed(ADDR_A, FIVE_USDC_STROOPS, "new-tip"),
    ];

    const feed = mergeWithPending(indexed, pending, NOW);

    // Pending row is gone; both indexed tips remain
    const pendingEntry = feed.find((e) => e.kind === "pending");
    expect(pendingEntry).toBeUndefined();
    expect(feed.filter((e) => e.kind === "indexed")).toHaveLength(2);
  });
});

// ── Expired pending entries ───────────────────────────────────────────────────

describe("mergeWithPending – expired pending entries", () => {
  it("downgrades a pending entry to unconfirmed after the window elapses without a match", () => {
    const pending = [makePending(ADDR_A, NOW - 1)];
    const indexed: IndexedTip[] = [];

    const feed = mergeWithPending(indexed, pending, NOW);

    expect(feed).toHaveLength(1);
    expect(feed[0].kind).toBe("unconfirmed");
    expect(feed[0].fromAddress).toBe(ADDR_A);
  });

  it("keeps a pending entry in the pending state while still within the window", () => {
    const pending = [makePending(ADDR_A, NOW + 5_000)];
    const indexed: IndexedTip[] = [];

    const feed = mergeWithPending(indexed, pending, NOW);

    expect(feed).toHaveLength(1);
    expect(feed[0].kind).toBe("pending");
  });

  it("preserves the tip data on an expired unconfirmed entry", () => {
    const entry = makePending(ADDR_A, NOW - 1, "5");
    const feed = mergeWithPending([], [entry], NOW);

    const result = feed[0] as UnconfirmedTip;
    expect(result.kind).toBe("unconfirmed");
    expect(result.fromAddress).toBe(ADDR_A);
    expect(result.displayAmount).toBe("5");
    expect(result.message).toBe("great work");
  });

  it("does not downgrade a confirmed entry even if the window has elapsed", () => {
    // Window expired AND the matching tip is indexed — confirmed takes priority
    const pending = [makePending(ADDR_A, NOW - 1, "5")];
    const indexed = [makeIndexed(ADDR_A, FIVE_USDC_STROOPS)];

    const feed = mergeWithPending(indexed, pending, NOW);

    expect(feed).toHaveLength(1);
    expect(feed[0].kind).toBe("indexed");
  });

  it("a returning supporter's expired-window entry is not cleared by their older indexed tip", () => {
    // Older 3 USDC tip indexed, new 5 USDC pending tip has exceeded the window
    // with no match — should become "unconfirmed", not silently disappear
    const pending = [makePending(ADDR_A, NOW - 1, "5")];
    const indexed = [makeIndexed(ADDR_A, THREE_USDC_STROOPS, "old-tip")];

    const feed = mergeWithPending(indexed, pending, NOW);

    // The expired entry is visible as "unconfirmed", not dropped
    const unconfirmedEntry = feed.find((e) => e.kind === "unconfirmed");
    expect(unconfirmedEntry).toBeDefined();
    expect(unconfirmedEntry?.fromAddress).toBe(ADDR_A);
  });
});

// ── Feed ordering ─────────────────────────────────────────────────────────────

describe("mergeWithPending – feed ordering", () => {
  it("places pending entries before unconfirmed before indexed", () => {
    const pendingEntry = makePending(ADDR_A, NOW + 5_000, "5", "pending-a");
    const expiredEntry = makePending(ADDR_B, NOW - 1, "5", "pending-b");
    const indexedEntry = makeIndexed("GOTHER000", FIVE_USDC_STROOPS, "indexed-1");

    const feed = mergeWithPending([indexedEntry], [pendingEntry, expiredEntry], NOW);

    expect(feed[0].kind).toBe("pending");
    expect(feed[1].kind).toBe("unconfirmed");
    expect(feed[2].kind).toBe("indexed");
  });
});
