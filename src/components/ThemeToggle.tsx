"use client";

/**
 * ThemeToggle.tsx
 *
 * Switches between the light and dark themes.
 *
 * The theme is already on <html> by the time this mounts — THEME_INIT_SCRIPT
 * (see lib/theme.ts) put it there before the first paint.  So this component
 * deliberately does *not* re-derive the theme from localStorage on mount, and
 * it holds no React state for it either: the icon and label are swapped by the
 * `dark:` variants below, driven by the same class.
 *
 * That is what keeps the button flash-free and hydration-safe — the server
 * renders exactly what the client renders, and CSS decides which half is
 * visible.
 */

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  applyTheme,
  getAppliedTheme,
  getStoredPreference,
  resolvePreference,
  setThemePreference,
} from "@/lib/theme";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  // Follow the OS while the user has not made an explicit choice.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const query = window.matchMedia(DARK_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (getStoredPreference() !== "system") return;
      applyTheme(event.matches ? "dark" : "light");
    };

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  // Keep other tabs in sync when the preference changes.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      // key === null means localStorage was cleared wholesale.
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
      applyTheme(resolvePreference(getStoredPreference()));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function handleClick() {
    setThemePreference(getAppliedTheme() === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
        "text-fg-subtle transition-colors hover:bg-surface-strong hover:text-fg",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/50",
        className,
      )}
    >
      {/* Icon + accessible name both track the applied class, via CSS only. */}
      <span className="text-base dark:hidden" aria-hidden="true">🌙</span>
      <span className="text-base hidden dark:inline" aria-hidden="true">☀️</span>
      <span className="sr-only dark:hidden">Switch to dark theme</span>
      <span className="sr-only hidden dark:inline">Switch to light theme</span>
    </button>
  );
}
