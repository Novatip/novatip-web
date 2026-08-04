/**
 * src/lib/theme.test.ts
 *
 * Unit tests for the theme helpers and, most importantly, for
 * THEME_INIT_SCRIPT — the blocking script that decides the theme before the
 * first paint.  Its resolution order is the acceptance criteria of the
 * "theme flashes" fix, so it is exercised directly here rather than through a
 * component.
 *
 * Covers:
 *   - Init script honours a stored preference over the OS setting
 *   - Init script falls back to prefers-color-scheme when nothing is stored
 *   - Init script tolerates junk values, blocked storage and no matchMedia
 *   - getAppliedTheme reads the class rather than re-deriving from storage
 *   - setThemePreference persists and applies; "system" clears the key
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  applyTheme,
  getAppliedTheme,
  getStoredPreference,
  getSystemTheme,
  resolvePreference,
  setThemePreference,
  storePreference,
} from "./theme";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** jsdom has no matchMedia; `null` simulates a browser without it entirely. */
function setOsPrefersDark(prefersDark: boolean | null) {
  if (prefersDark === null) {
    vi.stubGlobal("matchMedia", undefined);
    return;
  }
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("dark") ? prefersDark : false,
    media:   query,
    addEventListener:    vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

/** Run the real init script against jsdom and report the theme it applied. */
function runInitScript(): "light" | "dark" {
  document.documentElement.className = "";
  new Function(THEME_INIT_SCRIPT)();
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Pre-paint init script ─────────────────────────────────────────────────────

describe("THEME_INIT_SCRIPT", () => {
  it("uses the stored preference even when the OS disagrees", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    setOsPrefersDark(true);
    expect(runInitScript()).toBe("light");

    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    setOsPrefersDark(false);
    expect(runInitScript()).toBe("dark");
  });

  it("follows prefers-color-scheme when nothing is stored", () => {
    setOsPrefersDark(true);
    expect(runInitScript()).toBe("dark");

    setOsPrefersDark(false);
    expect(runInitScript()).toBe("light");
  });

  it("ignores an unrecognised stored value and falls back to the OS", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "chartreuse");
    setOsPrefersDark(false);
    expect(runInitScript()).toBe("light");
  });

  it("falls back to dark when matchMedia is unavailable", () => {
    setOsPrefersDark(null);
    expect(runInitScript()).toBe("dark");
  });

  it("still applies a theme when localStorage throws", () => {
    setOsPrefersDark(false);
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    // Storage is unreadable, so the OS setting decides.
    expect(runInitScript()).toBe("light");
  });

  it("never leaves the document without a resolved theme", () => {
    setOsPrefersDark(true);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

// ── Reading what was applied ──────────────────────────────────────────────────

describe("getAppliedTheme", () => {
  it("reads the class on <html> rather than re-deriving it from storage", () => {
    // Storage and the DOM deliberately disagree: the DOM is the truth.
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    document.documentElement.classList.remove("dark");
    expect(getAppliedTheme()).toBe("light");

    document.documentElement.classList.add("dark");
    expect(getAppliedTheme()).toBe("dark");
  });
});

// ── Preferences ───────────────────────────────────────────────────────────────

describe("preferences", () => {
  it("reports 'system' when nothing valid is stored", () => {
    expect(getStoredPreference()).toBe("system");

    window.localStorage.setItem(THEME_STORAGE_KEY, "chartreuse");
    expect(getStoredPreference()).toBe("system");
  });

  it("round-trips an explicit preference", () => {
    storePreference("light");
    expect(getStoredPreference()).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("clears the key for 'system' so the OS takes over again", () => {
    storePreference("dark");
    storePreference("system");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(getStoredPreference()).toBe("system");
  });

  it("resolves 'system' through prefers-color-scheme", () => {
    setOsPrefersDark(false);
    expect(getSystemTheme()).toBe("light");
    expect(resolvePreference("system")).toBe("light");
    expect(resolvePreference("dark")).toBe("dark");
  });

  it("persists and applies in one step", () => {
    setOsPrefersDark(true);
    expect(setThemePreference("light")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    expect(setThemePreference("dark")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(() => storePreference("dark")).not.toThrow();
    // The theme still applies for this page view.
    applyTheme("dark");
    expect(getAppliedTheme()).toBe("dark");
  });
});
