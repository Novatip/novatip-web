/**
 * src/lib/tipChartPrefs.test.ts
 *
 * Unit tests for the TipChart preference persistence helpers.
 *
 * Covers, for both the chart window and the chart mode:
 *   - Falls back to the default when nothing is stored
 *   - Restores a validly stored value
 *   - Rejects a stored value that is out of range or hand edited
 *   - Falls back to the default when storage throws
 *   - The store helpers round-trip and do not throw when storage is unavailable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CHART_MODE_STORAGE_KEY,
  CHART_WINDOW_STORAGE_KEY,
  DEFAULT_CHART_MODE,
  DEFAULT_CHART_WINDOW,
  getChartMode,
  getChartWindow,
  storeChartMode,
  storeChartWindow,
} from "./tipChartPrefs";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getChartWindow", () => {
  it("returns the default when nothing is stored", () => {
    expect(getChartWindow()).toBe(DEFAULT_CHART_WINDOW);
  });

  it.each([7, 14, 30])("restores a validly stored window of %i days", (days) => {
    window.localStorage.setItem(CHART_WINDOW_STORAGE_KEY, String(days));
    expect(getChartWindow()).toBe(days);
  });

  it.each([
    ["5", "not an offered window"],
    ["90", "out of range"],
    ["-7", "negative"],
    ["7.5", "fractional"],
    ["abc", "non-numeric"],
    ["", "empty"],
  ])("falls back to the default for a stored window of %j (%s)", (stored) => {
    window.localStorage.setItem(CHART_WINDOW_STORAGE_KEY, stored);
    expect(getChartWindow()).toBe(DEFAULT_CHART_WINDOW);
  });

  it("falls back to the default when storage throws", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(getChartWindow()).toBe(DEFAULT_CHART_WINDOW);
  });
});

describe("storeChartWindow", () => {
  it("round-trips through getChartWindow", () => {
    storeChartWindow(14);
    expect(getChartWindow()).toBe(14);
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(() => storeChartWindow(7)).not.toThrow();
  });
});

describe("getChartMode", () => {
  it("returns the default when nothing is stored", () => {
    expect(getChartMode()).toBe(DEFAULT_CHART_MODE);
  });

  it.each(["count", "amount"] as const)("restores a validly stored mode of %s", (mode) => {
    window.localStorage.setItem(CHART_MODE_STORAGE_KEY, mode);
    expect(getChartMode()).toBe(mode);
  });

  it.each([
    ["total", "unknown mode"],
    ["Amount", "wrong case"],
    ["30", "a window value"],
    ["", "empty"],
  ])("falls back to the default for a stored mode of %j (%s)", (stored) => {
    window.localStorage.setItem(CHART_MODE_STORAGE_KEY, stored);
    expect(getChartMode()).toBe(DEFAULT_CHART_MODE);
  });

  it("falls back to the default when storage throws", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(getChartMode()).toBe(DEFAULT_CHART_MODE);
  });
});

describe("storeChartMode", () => {
  it("round-trips through getChartMode", () => {
    storeChartMode("amount");
    expect(getChartMode()).toBe("amount");
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(() => storeChartMode("amount")).not.toThrow();
  });
});
