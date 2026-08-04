/**
 * lib/theme.ts
 *
 * Single source of truth for the light/dark theme.
 *
 * The resolved theme lives on <html> as Tailwind's `dark` class
 * (`darkMode: "class"`).  It is put there by THEME_INIT_SCRIPT — a tiny
 * blocking script injected into the document <head> in app/layout.tsx — so
 * the correct theme is painted on the very first frame instead of being
 * swapped in after hydration.
 *
 * Anything running after hydration should read the class that script already
 * applied (getAppliedTheme) rather than re-deriving the theme from storage.
 */

/** localStorage key holding the user's explicit choice, if they made one. */
export const THEME_STORAGE_KEY = "novatip_theme";

export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/** What the user asked for — "system" means "follow the OS". */
export type ThemePreference = "light" | "dark" | "system";

/** What is actually painted, once "system" has been resolved. */
export type ResolvedTheme = "light" | "dark";

/**
 * Theme used when we cannot ask the browser anything (server render, or a
 * client with no matchMedia).  Novatip has always been a dark-first product,
 * so dark is the safest guess.
 */
const FALLBACK_THEME: ResolvedTheme = "dark";

function isExplicitPreference(value: unknown): value is ResolvedTheme {
  return value === "light" || value === "dark";
}

/** The stored preference, or "system" if none was stored (or storage is blocked). */
export function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isExplicitPreference(raw) ? raw : "system";
  } catch {
    // Safari private mode / storage disabled — fall back to the OS setting.
    return "system";
  }
}

/** What the OS currently prefers. */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return FALLBACK_THEME;
  }
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

export function resolvePreference(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

/**
 * The theme that is currently on screen — i.e. whatever THEME_INIT_SCRIPT (or
 * a later applyTheme call) put on <html>.  Deliberately does not consult
 * localStorage: the class is the truth once the page has painted.
 */
export function getAppliedTheme(): ResolvedTheme {
  if (typeof document === "undefined") return FALLBACK_THEME;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Persist a preference. "system" clears the key so the OS setting takes over. */
export function storePreference(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    if (preference === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Storage unavailable — the theme still applies for this page view.
  }
}

/** Persist a preference and apply it immediately. Returns the resolved theme. */
export function setThemePreference(preference: ThemePreference): ResolvedTheme {
  const resolved = resolvePreference(preference);
  storePreference(preference);
  applyTheme(resolved);
  return resolved;
}

/**
 * Blocking script that applies the theme before the first paint.
 *
 * Kept deliberately small and dependency-free — it runs inline in <head>,
 * ahead of the stylesheet and any React code.  It mirrors the logic of
 * getStoredPreference + getSystemTheme above; the storage key and media query
 * are interpolated from the constants so the two cannot drift apart.
 *
 * Everything is wrapped in try/catch: if storage throws we still want a theme
 * on the element rather than an unstyled document.
 */
export const THEME_INIT_SCRIPT = `(function(){
try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};
var q=${JSON.stringify(DARK_MEDIA_QUERY)};
var p=null;
try{p=window.localStorage.getItem(k)}catch(e){}
var s=(window.matchMedia&&window.matchMedia(q).matches)?"dark":(window.matchMedia?"light":${JSON.stringify(FALLBACK_THEME)});
var t=(p==="dark"||p==="light")?p:s;
document.documentElement.classList.toggle("dark",t==="dark");
}catch(e){
document.documentElement.classList.add("dark");
}
})();`;
