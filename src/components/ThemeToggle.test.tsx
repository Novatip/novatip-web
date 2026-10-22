/**
 * src/components/ThemeToggle.test.tsx
 *
 * Unit tests for ThemeToggle.
 *
 * Covers:
 *   - Identical initial markup in both painted themes (no hydration mismatch)
 *   - Cycling system → explicit theme → other explicit theme → system, with
 *     the accessible name and icon following the current preference
 *   - The first click from "system" flips whatever is currently painted
 *   - An explicit stored preference is adopted after hydration
 *   - OS changes are followed only while no explicit preference is stored
 *   - A preference change in another tab is picked up via the storage event
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeToggle } from "./ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

// ── Helpers ───────────────────────────────────────────────────────────────────

type MediaListener = (event: MediaQueryListEvent) => void;

const listeners = new Set<MediaListener>();

/** Stub matchMedia and hand back a trigger for simulating an OS theme change. */
function stubMatchMedia(prefersDark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("dark") ? prefersDark : false,
    media:   query,
    addEventListener:    (_: string, cb: MediaListener) => listeners.add(cb),
    removeEventListener: (_: string, cb: MediaListener) => listeners.delete(cb),
  }));
}

function emitOsThemeChange(prefersDark: boolean) {
  act(() => {
    listeners.forEach((cb) => cb({ matches: prefersDark } as MediaQueryListEvent));
  });
}

/** Stand in for the pre-paint init script. */
function applyThemeClass(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

function getToggle() {
  return screen.getByRole("button", { name: /^Theme:/ });
}

beforeEach(() => {
  listeners.clear();
  window.localStorage.clear();
  document.documentElement.className = "";
  stubMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("ThemeToggle – rendering", () => {
  it("renders identical initial markup in both themes so hydration cannot mismatch", () => {
    // Server rendering skips effects, which is exactly the render the client
    // hydrates against. Both painted themes must produce the same markup.
    applyThemeClass("dark");
    const darkMarkup = renderToStaticMarkup(<ThemeToggle />);

    applyThemeClass("light");
    const lightMarkup = renderToStaticMarkup(<ThemeToggle />);

    expect(lightMarkup).toBe(darkMarkup);
  });

  it("names the current preference and the next one in the accessible name", () => {
    applyThemeClass("dark");
    render(<ThemeToggle />);

    expect(getToggle()).toHaveAccessibleName(
      "Theme: system. Switch to light theme.",
    );
    expect(getToggle()).toHaveTextContent("🖥️");
  });

  it("adopts an explicit stored preference after hydration", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    applyThemeClass("light");
    render(<ThemeToggle />);

    expect(getToggle()).toHaveAccessibleName(
      "Theme: light. Switch to dark theme.",
    );
    expect(getToggle()).toHaveTextContent("☀️");
  });
});

// ── Cycling through all three preferences ────────────────────────────────────

describe("ThemeToggle – cycling", () => {
  it("cycles system → light → dark → system and names each step", async () => {
    stubMatchMedia(true);
    applyThemeClass("dark"); // the OS is dark, and no explicit choice is stored
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = getToggle();
    expect(toggle).toHaveAccessibleName(
      "Theme: system. Switch to light theme.",
    );

    // system → light
    await user.click(toggle);
    expect(isDark()).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(toggle).toHaveAccessibleName(
      "Theme: light. Switch to dark theme.",
    );
    expect(toggle).toHaveTextContent("☀️");

    // light → dark
    await user.click(toggle);
    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(toggle).toHaveAccessibleName(
      "Theme: dark. Switch to system theme.",
    );
    expect(toggle).toHaveTextContent("🌙");

    // dark → system, which resolves to the OS preference and clears the key
    await user.click(toggle);
    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(toggle).toHaveAccessibleName(
      "Theme: system. Switch to light theme.",
    );
    expect(toggle).toHaveTextContent("🖥️");
  });

  it("flips the painted theme on the first click when the OS is light", async () => {
    stubMatchMedia(false);
    applyThemeClass("light");
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = getToggle();
    expect(toggle).toHaveAccessibleName(
      "Theme: system. Switch to dark theme.",
    );

    await user.click(toggle);

    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(toggle).toHaveAccessibleName(
      "Theme: dark. Switch to system theme.",
    );
  });

  it("starts from an explicit stored preference rather than assuming system", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    applyThemeClass("dark");
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = getToggle();
    expect(toggle).toHaveAccessibleName(
      "Theme: dark. Switch to system theme.",
    );

    await user.click(toggle);

    // system resolves to the stubbed light OS, and the key is cleared.
    expect(isDark()).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});

// ── Following the OS ──────────────────────────────────────────────────────────

describe("ThemeToggle – OS preference", () => {
  it("follows an OS change while no explicit preference is stored", () => {
    applyThemeClass("light");
    render(<ThemeToggle />);

    emitOsThemeChange(true);
    expect(isDark()).toBe(true);
    expect(getToggle()).toHaveAccessibleName(
      "Theme: system. Switch to light theme.",
    );

    emitOsThemeChange(false);
    expect(isDark()).toBe(false);
    expect(getToggle()).toHaveAccessibleName(
      "Theme: system. Switch to dark theme.",
    );
  });

  it("ignores an OS change once the user has chosen", async () => {
    applyThemeClass("dark");
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(getToggle()); // user explicitly picks light
    expect(isDark()).toBe(false);

    emitOsThemeChange(true);
    expect(isDark()).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});

// ── Cross-tab sync ────────────────────────────────────────────────────────────

describe("ThemeToggle – cross-tab sync", () => {
  it("adopts a preference changed in another tab", () => {
    applyThemeClass("light");
    render(<ThemeToggle />);

    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" }),
      );
    });

    expect(isDark()).toBe(true);
    expect(getToggle()).toHaveAccessibleName(
      "Theme: dark. Switch to system theme.",
    );
  });

  it("returns to system when another tab clears the preference", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    applyThemeClass("dark");
    render(<ThemeToggle />);

    window.localStorage.removeItem(THEME_STORAGE_KEY);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: null, newValue: null }),
      );
    });

    expect(isDark()).toBe(false); // the stubbed OS prefers light
    expect(getToggle()).toHaveAccessibleName(
      "Theme: system. Switch to dark theme.",
    );
  });

  it("ignores storage events for unrelated keys", () => {
    applyThemeClass("light");
    render(<ThemeToggle />);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "some_other_key", newValue: "dark" }),
      );
    });

    expect(isDark()).toBe(false);
    expect(getToggle()).toHaveAccessibleName(
      "Theme: system. Switch to dark theme.",
    );
  });
});
