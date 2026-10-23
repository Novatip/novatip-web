/**
 * lib/tipChartPrefs.ts
 *
 * Remembers the creator's TipChart preferences (window size and view mode) per
 * browser, so the chart opens where they left it instead of always resetting
 * to 30 days and the count view. Purely a convenience — nothing here is ever
 * trusted without being re-validated, since it is easy to hand-edit or come
 * from an older version of the app.
 *
 * Follows the same pattern as lib/lastTipAmount.ts: validate on read, fall
 * back to the default, tolerate blocked storage.
 */

export const CHART_WINDOW_STORAGE_KEY = "novatip_chart_window";
export const CHART_MODE_STORAGE_KEY   = "novatip_chart_mode";

/** Default window when nothing valid is stored yet. */
export const DEFAULT_CHART_WINDOW = 30 as const;

/** Default mode when nothing valid is stored yet. */
export const DEFAULT_CHART_MODE = "count" as const;

export type ChartWindow = 7 | 14 | 30;
export type ChartMode = "count" | "amount";

const VALID_WINDOWS: ChartWindow[] = [7, 14, 30];
const VALID_MODES: ChartMode[] = ["count", "amount"];

/**
 * The creator's last chart window, or DEFAULT_CHART_WINDOW when nothing is
 * stored, storage is unavailable, or the stored value is no longer valid.
 */
export function getChartWindow(): ChartWindow {
  if (typeof window === "undefined") return DEFAULT_CHART_WINDOW;
  try {
    const raw = window.localStorage.getItem(CHART_WINDOW_STORAGE_KEY);
    if (raw) {
      const n = Number(raw);
      if (VALID_WINDOWS.includes(n as ChartWindow)) return n as ChartWindow;
    }
    return DEFAULT_CHART_WINDOW;
  } catch {
    return DEFAULT_CHART_WINDOW;
  }
}

/** Persist the chart window for next time. No-ops if storage is unavailable. */
export function storeChartWindow(days: ChartWindow): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHART_WINDOW_STORAGE_KEY, String(days));
  } catch {
    // Storage unavailable — the chart still works with its default.
  }
}

/**
 * The creator's last chart mode, or DEFAULT_CHART_MODE when nothing is stored,
 * storage is unavailable, or the stored value is no longer valid.
 */
export function getChartMode(): ChartMode {
  if (typeof window === "undefined") return DEFAULT_CHART_MODE;
  try {
    const raw = window.localStorage.getItem(CHART_MODE_STORAGE_KEY);
    if (raw && VALID_MODES.includes(raw as ChartMode)) return raw as ChartMode;
    return DEFAULT_CHART_MODE;
  } catch {
    return DEFAULT_CHART_MODE;
  }
}

/** Persist the chart mode for next time. No-ops if storage is unavailable. */
export function storeChartMode(mode: ChartMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHART_MODE_STORAGE_KEY, mode);
  } catch {
    // Storage unavailable — the chart still works with its default.
  }
}
