/**
 * src/components/ThemeToggle.test.tsx
 *
 * Unit tests for ThemeToggle.
 *
 * Covers:
 *   - Renders identical markup regardless of the applied theme (no hydration
 *     mismatch — the icon and label are swapped by CSS, not by React)
 *   - Clicking flips the class on <html> and persists the new preference
 *   - It reads the applied class, not localStorage, when deciding which way to flip
 *   - OS changes are followed only while no explicit preference is stored
 *   - A preference change in another tab is picked up via the storage event
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  return screen.getByRole("button", { name: /switch to (dark|light) theme/i });
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
  it("renders the same markup in both themes so hydration cannot mismatch", () => {
    applyThemeClass("dark");
    const { container } = render(<ThemeToggle />);
    const darkMarkup = container.innerHTML;

    cleanup();
    applyThemeClass("light");
    const { container: lightContainer } = render(<ThemeToggle />);

    expect(lightContainer.innerHTML).toBe(darkMarkup);
  });

  it("offers both accessible labels, leaving CSS to reveal the right one", () => {
    applyThemeClass("dark");
    render(<ThemeToggle />);

    expect(screen.getByText("Switch to light theme")).toBeInTheDocument();
    expect(screen.getByText("Switch to dark theme")).toBeInTheDocument();
  });
});

// ── Toggling ──────────────────────────────────────────────────────────────────

describe("ThemeToggle – toggling", () => {
  it("switches dark to light and stores the preference", async () => {
    applyThemeClass("dark");
    render(<ThemeToggle />);

    await userEvent.click(getToggle());

    expect(isDark()).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("switches light to dark and stores the preference", async () => {
    applyThemeClass("light");
    render(<ThemeToggle />);

    await userEvent.click(getToggle());

    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("flips from the applied class, not from a stale stored value", async () => {
    // Storage says dark but the document is light — e.g. another tab changed it.
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    applyThemeClass("light");
    render(<ThemeToggle />);

    await userEvent.click(getToggle());

    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("survives repeated toggling", async () => {
    applyThemeClass("light");
    render(<ThemeToggle />);

    await userEvent.click(getToggle());
    await userEvent.click(getToggle());
    await userEvent.click(getToggle());

    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});

// ── Following the OS ──────────────────────────────────────────────────────────

describe("ThemeToggle – OS preference", () => {
  it("follows an OS change while no explicit preference is stored", () => {
    applyThemeClass("light");
    render(<ThemeToggle />);

    emitOsThemeChange(true);
    expect(isDark()).toBe(true);

    emitOsThemeChange(false);
    expect(isDark()).toBe(false);
  });

  it("ignores an OS change once the user has chosen", async () => {
    applyThemeClass("dark");
    render(<ThemeToggle />);

    await userEvent.click(getToggle()); // user explicitly picks light
    expect(isDark()).toBe(false);

    emitOsThemeChange(true);
    expect(isDark()).toBe(false);
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
  });
});
