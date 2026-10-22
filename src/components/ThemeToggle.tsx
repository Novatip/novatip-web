"use client";

/**
 * ThemeToggle.tsx
 *
 * Cycles the theme preference through light, dark and system.
 *
 * The theme is already on <html> by the time this mounts — THEME_INIT_SCRIPT
 * (see lib/theme.ts) put it there before the first paint.  This component
 * still keeps the *preference* in React state, because "system" and an
 * explicit light/dark choice can paint the same theme while being different
 * preferences — and the icon and accessible name have to say which one is
 * active.
 *
 * Hydration safety: the server cannot read localStorage, so the first client
 * render deliberately starts from the same "system" default.  An effect then
 * adopts the real preference and the applied theme immediately after
 * hydration.  CSS cannot express the three-state cycle on its own, so the
 * icon is driven by that state instead of the old `dark:`-only pair.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  applyTheme,
  getAppliedTheme,
  getStoredPreference,
  resolvePreference,
  setThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

interface ThemeToggleProps {
  className?: string;
}

/** One glyph per preference, so "system" is distinguishable from an explicit choice. */
const ICONS: Record<ThemePreference, string> = {
  light: "☀️",
  dark: "🌙",
  system: "🖥️",
};

const NAMES: Record<ThemePreference, string> = {
  light: "light",
  dark: "dark",
  system: "system",
};

/**
 * The next preference in the cycle.
 *
 * Leaving "system" flips whatever is currently painted, so the first click
 * still behaves like the old two-state toggle.  From an explicit choice the
 * control moves to the other explicit choice and then back to "system".
 */
function nextPreference(
  preference: ThemePreference,
  applied: ResolvedTheme,
): ThemePreference {
  if (preference === "system") return applied === "dark" ? "light" : "dark";
  return preference === "light" ? "dark" : "system";
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  // The server and the first client render must agree; "system" is the only
  // preference either of them can know without localStorage.
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [appliedTheme, setAppliedTheme] = useState<ResolvedTheme>("dark");

  // Adopt the real stored preference after hydration.
  useEffect(() => {
    setPreference(getStoredPreference());
    setAppliedTheme(getAppliedTheme());
  }, []);

  // Follow the OS while the user has not made an explicit choice.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const query = window.matchMedia(DARK_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (getStoredPreference() !== "system") return;
      const resolved = event.matches ? "dark" : "light";
      applyTheme(resolved);
      setAppliedTheme(resolved);
    };

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  // Keep other tabs in sync when the preference changes.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      // key === null means localStorage was cleared wholesale.
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
      const stored = getStoredPreference();
      const resolved = resolvePreference(stored);
      applyTheme(resolved);
      setPreference(stored);
      setAppliedTheme(resolved);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function handleClick() {
    const next = nextPreference(preference, appliedTheme);
    setAppliedTheme(setThemePreference(next));
    setPreference(next);
  }

  const next = nextPreference(preference, appliedTheme);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Theme: ${NAMES[preference]}. Switch to ${NAMES[next]} theme.`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
        "text-fg-subtle transition-colors hover:bg-surface-strong hover:text-fg",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/50",
        className,
      )}
    >
      <span className="text-base" aria-hidden="true">
        {ICONS[preference]}
      </span>
    </button>
  );
}
