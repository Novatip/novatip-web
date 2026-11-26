/**
 * lib/format.ts
 *
 * Shared formatting utilities for dates and numbers, ensuring consistent
 * locale behavior across the app. All formatters use the browser's default
 * locale (navigator.language) so a creator in Germany sees German formatting
 * and a creator in the US sees US formatting.
 *
 * Before this file existed, dates were pinned to en-US while numbers followed
 * the browser default, so a creator in Germany saw "Nov 22, 2026" next to
 * "1.234" (German thousand separator). This file unifies that decision.
 */

/**
 * Get the browser's preferred locale, falling back to en-US if unavailable.
 * Used internally by all formatters so locale selection happens in one place.
 */
function getLocale(): string {
  return typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
}

/**
 * Format a Date as a short date string (e.g., "Nov 22, 2026" in en-US, "22. Nov. 2026" in de-DE).
 * Used by timeAgo() for dates older than 24 hours.
 */
export function formatShortDate(date: Date, localeOverride?: string): string {
  return date.toLocaleDateString(localeOverride ?? getLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a Date as a medium date and time string.
 * Used by formatAbsoluteTime() for hover titles on relative timestamps.
 */
export function formatMediumDateTime(date: Date, localeOverride?: string): string {
  return date.toLocaleString(localeOverride ?? getLocale(), {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

/**
 * Format a number with locale-specific thousand separators and decimal points.
 * Used in TipChart summary and SplitsManager basis points display.
 */
export function formatNumber(value: number, localeOverride?: string): string {
  return value.toLocaleString(localeOverride ?? getLocale());
}
