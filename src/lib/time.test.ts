/**
 * src/lib/time.test.ts
 *
 * Unit tests for the shared timeAgo formatter and formatAbsoluteTime.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { timeAgo, formatAbsoluteTime } from "./time";

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

  it("switches to a calendar date once a full day has passed", () => {
    const now = new Date("2024-01-15T12:00:00.000Z").getTime();
    freeze(now);
    const threeDaysAgo = new Date(now - 3 * 86_400_000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe("Jan 12, 2024");
  });

  it("stays on hours right up to the 24h boundary", () => {
    const now = new Date("2024-01-15T12:00:00.000Z").getTime();
    freeze(now);
    const justUnderADay = new Date(now - (86_400_000 - 1)).toISOString();
    expect(timeAgo(justUnderADay)).toBe("23h ago");
  });
});

describe("formatAbsoluteTime", () => {
  it("formats an ISO timestamp into a readable date and time", () => {
    const result = formatAbsoluteTime("2026-01-05T15:45:12.000Z");
    // Exact wording depends on the runtime's locale data, but it must carry
    // the date, and the reconciliation use case this exists for needs a time.
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("renders a formatted local-time string rather than echoing the raw ISO timestamp", () => {
    const iso = "2026-01-05T15:45:12.000Z";
    expect(formatAbsoluteTime(iso)).not.toBe(iso);
  });
});
