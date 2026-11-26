/**
 * lib/rawAmount.test.ts
 *
 * Tests for raw amount parsing and formatting utilities.
 */

import { describe, it, expect } from "vitest";
import { parseRawAmount, formatRawUsdc } from "./rawAmount";

describe("parseRawAmount", () => {
  it("parses a valid amount string", () => {
    expect(parseRawAmount("10000000")).toBe(10000000n);
  });

  it("parses zero", () => {
    expect(parseRawAmount("0")).toBe(0n);
  });

  it("parses large amounts", () => {
    expect(parseRawAmount("123456789012345")).toBe(123456789012345n);
  });

  it("returns null for empty string", () => {
    expect(parseRawAmount("")).toBe(null);
  });

  it("returns null for non-numeric strings", () => {
    expect(parseRawAmount("abc")).toBe(null);
    expect(parseRawAmount("12.34")).toBe(null);
    expect(parseRawAmount("not a number")).toBe(null);
  });

  it("returns null for null or undefined coerced to string", () => {
    expect(parseRawAmount("null")).toBe(null);
    expect(parseRawAmount("undefined")).toBe(null);
  });
});

describe("formatRawUsdc", () => {
  it("formats a valid amount with 2 decimals by default", () => {
    expect(formatRawUsdc("10000000")).toBe("1.00");
  });

  it("formats zero", () => {
    expect(formatRawUsdc("0")).toBe("0.00");
  });

  it("formats large amounts", () => {
    expect(formatRawUsdc("123456780000000")).toBe("12,345,678.00");
  });

  it("formats with custom decimal places", () => {
    expect(formatRawUsdc("12345670", 4)).toBe("1.2346");
  });

  it("returns dash for invalid amounts", () => {
    expect(formatRawUsdc("")).toBe("—");
    expect(formatRawUsdc("abc")).toBe("—");
    expect(formatRawUsdc("12.34")).toBe("—");
    expect(formatRawUsdc("not a number")).toBe("—");
  });

  it("handles fractional USDC correctly", () => {
    expect(formatRawUsdc("5000000")).toBe("0.50");
    expect(formatRawUsdc("1")).toBe("0.00");
    expect(formatRawUsdc("1234567")).toBe("0.12");
  });
});
