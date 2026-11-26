/**
 * src/lib/format.test.ts
 *
 * Unit tests for the shared locale formatting utilities.
 *
 * Tests pass explicit locales to ensure stable output regardless of the
 * test runner's environment. In production, these formatters use the
 * browser's default locale (navigator.language).
 */

import { describe, it, expect } from "vitest";
import { formatShortDate, formatMediumDateTime, formatNumber } from "./format";

describe("formatShortDate", () => {
  it("formats a date in the specified locale", () => {
    const date = new Date("2026-11-22T15:30:00.000Z");
    expect(formatShortDate(date, "en-US")).toBe("Nov 22, 2026");
  });

  it("formats a date differently in another locale", () => {
    const date = new Date("2026-11-22T15:30:00.000Z");
    const result = formatShortDate(date, "de-DE");
    // German format: "22. Nov. 2026" or similar
    expect(result).toContain("22");
    expect(result).toContain("2026");
  });

  it("handles January dates", () => {
    const date = new Date("2026-01-05T12:00:00.000Z");
    expect(formatShortDate(date, "en-US")).toBe("Jan 5, 2026");
  });

  it("handles December dates", () => {
    const date = new Date("2026-12-31T23:59:59.000Z");
    expect(formatShortDate(date, "en-US")).toBe("Dec 31, 2026");
  });
});

describe("formatMediumDateTime", () => {
  it("formats a date and time in the specified locale", () => {
    const date = new Date("2026-01-05T15:45:12.000Z");
    const result = formatMediumDateTime(date, "en-US");
    // Must contain the year and a time component
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("includes both date and time components", () => {
    const date = new Date("2026-06-15T09:30:00.000Z");
    const result = formatMediumDateTime(date, "en-US");
    expect(result).toContain("2026");
    // Time is included
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("formatNumber", () => {
  it("formats a number with en-US thousand separators", () => {
    expect(formatNumber(1234, "en-US")).toBe("1,234");
    expect(formatNumber(10000, "en-US")).toBe("10,000");
  });

  it("formats a number with de-DE thousand separators", () => {
    // German uses period for thousands, comma for decimal
    expect(formatNumber(1234, "de-DE")).toBe("1.234");
    expect(formatNumber(10000, "de-DE")).toBe("10.000");
  });

  it("formats small numbers without separators", () => {
    expect(formatNumber(123, "en-US")).toBe("123");
    expect(formatNumber(999, "en-US")).toBe("999");
  });

  it("handles zero", () => {
    expect(formatNumber(0, "en-US")).toBe("0");
  });

  it("handles negative numbers", () => {
    expect(formatNumber(-1234, "en-US")).toBe("-1,234");
  });

  it("formats large numbers correctly", () => {
    expect(formatNumber(1234567, "en-US")).toBe("1,234,567");
  });
});
