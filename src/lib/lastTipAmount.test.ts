/**
 * src/lib/lastTipAmount.test.ts
 *
 * Unit tests for the last-tip-amount persistence helpers.
 *
 * Covers:
 *   - Falls back to DEFAULT_TIP_AMOUNT when nothing is stored
 *   - Restores a validly stored amount
 *   - Rejects a stored amount that is no longer valid (zero, negative,
 *     non-numeric, over the custom-tip ceiling)
 *   - Falls back to the default when storage throws (private mode etc.)
 *   - storeLastTipAmount round-trips through getLastTipAmount
 *   - storeLastTipAmount does not throw when storage is unavailable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DEFAULT_TIP_AMOUNT,
  LAST_TIP_AMOUNT_STORAGE_KEY,
  getLastTipAmount,
  storeLastTipAmount,
} from "./lastTipAmount";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getLastTipAmount", () => {
  it("returns the default when nothing is stored", () => {
    expect(getLastTipAmount()).toBe(DEFAULT_TIP_AMOUNT);
  });

  it("restores a validly stored amount", () => {
    window.localStorage.setItem(LAST_TIP_AMOUNT_STORAGE_KEY, "7.5");
    expect(getLastTipAmount()).toBe("7.5");
  });

  it.each([
    ["0", "zero"],
    ["-5", "negative"],
    ["not-a-number", "non-numeric"],
    ["5000", "over the custom-tip ceiling"],
  ])("falls back to the default for a stored amount of %s (%s)", (stored) => {
    window.localStorage.setItem(LAST_TIP_AMOUNT_STORAGE_KEY, stored);
    expect(getLastTipAmount()).toBe(DEFAULT_TIP_AMOUNT);
  });

  it("falls back to the default when storage throws", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(getLastTipAmount()).toBe(DEFAULT_TIP_AMOUNT);
  });
});

describe("storeLastTipAmount", () => {
  it("round-trips through getLastTipAmount", () => {
    storeLastTipAmount("12.5");
    expect(getLastTipAmount()).toBe("12.5");
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(() => storeLastTipAmount("12.5")).not.toThrow();
  });
});
