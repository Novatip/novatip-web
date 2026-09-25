/**
 * src/components/RecentTips.test.ts
 *
 * Unit tests for the pure helpers exported from RecentTips.
 *
 * Covers:
 *   - timeAgo: future timestamps (clock skew) render as "just now"
 *   - timeAgo: past timestamps are formatted correctly
 *   - isPendingConfirmed: returns true when the address is in the indexed list
 *   - isPendingConfirmed: returns false when the address is absent
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { timeAgo, isPendingConfirmed } from "./RecentTips";

// ── timeAgo ───────────────────────────────────────────────────────────────────

describe("timeAgo", () => {
  afterEach(() => vi.restoreAllMocks());

  function freeze(nowMs: number) {
    vi.spyOn(Date, "now").mockReturnValue(nowMs);
  }

  it("returns 'just now' for a timestamp a few seconds in the future (clock skew)", () => {
    const now = new Date("2024-01-01T12:00:00.000Z").getTime();
    freeze(now);
    // Ledger timestamp 5 seconds ahead of the client clock
    const future = new Date(now + 5_000).toISOString();
    expect(timeAgo(future)).toBe("just now");
  });

  it("returns 'just now' for a timestamp exactly at now", () => {
    const now = new Date("2024-01-01T12:00:00.000Z").getTime();
    freeze(now);
    expect(timeAgo(new Date(now).toISOString())).toBe("just now");
  });

  it("returns 'just now' for a timestamp within the 5-second floor", () => {
    const now = new Date("2024-01-01T12:00:00.000Z").getTime();
    freeze(now);
    const almostFiveSeconds = new Date(now - 4_000).toISOString();
    expect(timeAgo(almostFiveSeconds)).toBe("just now");
  });

  it("formats seconds correctly for a past timestamp", () => {
    const now = new Date("2024-01-01T12:00:00.000Z").getTime();
    freeze(now);
    const thirtySecondsAgo = new Date(now - 30_000).toISOString();
    expect(timeAgo(thirtySecondsAgo)).toBe("30s ago");
  });

  it("formats minutes correctly", () => {
    const now = new Date("2024-01-01T12:00:00.000Z").getTime();
    freeze(now);
    const fiveMinutesAgo = new Date(now - 5 * 60_000).toISOString();
    expect(timeAgo(fiveMinutesAgo)).toBe("5m ago");
  });

  it("formats hours correctly", () => {
    const now = new Date("2024-01-01T12:00:00.000Z").getTime();
    freeze(now);
    const twoHoursAgo = new Date(now - 2 * 3_600_000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("formats days correctly", () => {
    const now = new Date("2024-01-01T12:00:00.000Z").getTime();
    freeze(now);
    const threeDaysAgo = new Date(now - 3 * 86_400_000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe("3d ago");
  });
});

// ── isPendingConfirmed ────────────────────────────────────────────────────────

describe("isPendingConfirmed", () => {
  const indexed = [
    { fromAddress: "GABC" },
    { fromAddress: "GXYZ" },
  ];

  it("returns true when the pending address appears in the indexed list", () => {
    expect(isPendingConfirmed({ fromAddress: "GABC" }, indexed)).toBe(true);
  });

  it("returns false when the pending address is absent", () => {
    expect(isPendingConfirmed({ fromAddress: "GZZZ" }, indexed)).toBe(false);
  });

  it("returns false for an empty indexed list", () => {
    expect(isPendingConfirmed({ fromAddress: "GABC" }, [])).toBe(false);
  });
});
