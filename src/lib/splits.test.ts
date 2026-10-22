/**
 * src/lib/splits.test.ts
 *
 * Unit tests for the formatBps helper.
 *
 * Covers the cases called out in the bug report:
 *   - 1 bps must not display as "0.0%"
 *   - 3333 bps must show two decimal places so three recipients of
 *     3333 / 3333 / 3334 bps don't appear to sum to 99.9%
 *   - 10000 bps (100%) must not gain a spurious decimal
 *
 * Plus a handful of common values for confidence.
 */

import { describe, it, expect } from "vitest";
import { formatBps } from "./splits";

describe("formatBps", () => {
  it("formats 1 bps as 0.01% instead of 0.0%", () => {
    expect(formatBps(1)).toBe("0.01%");
  });

  it("formats 3333 bps as 33.33%", () => {
    expect(formatBps(3333)).toBe("33.33%");
  });

  it("formats 10000 bps as 100% without trailing zeros", () => {
    expect(formatBps(10000)).toBe("100%");
  });

  it("trims trailing zero for whole-number percentages", () => {
    expect(formatBps(5000)).toBe("50%");
    expect(formatBps(2500)).toBe("25%");
  });

  it("trims one trailing zero when only one decimal is needed", () => {
    // 500 bps = 5.00% → should show 5%, but 150 bps = 1.50% → should show 1.5%
    expect(formatBps(500)).toBe("5%");
    expect(formatBps(150)).toBe("1.5%");
  });

  it("formats 3334 bps as 33.34%", () => {
    expect(formatBps(3334)).toBe("33.34%");
  });
});
