/**
 * lib/splits.ts
 * Shared helpers for working with basis-point split values.
 */

/**
 * Format a basis-point value as a human-readable percentage string.
 *
 * Uses up to two decimal places, trimming trailing zeros so that:
 *   - 10000 bps → "100%"   (not "100.00%")
 *   -  5000 bps → "50%"    (not "50.00%")
 *   -  3333 bps → "33.33%" (not "33.3%")
 *   -     1 bps → "0.01%"  (not "0.0%")
 *
 * `toFixed(1)` cannot represent every basis point — one basis point is
 * 0.01 %, which rounds to "0.0%". Using two decimals and `parseFloat` to
 * strip trailing zeros handles all values correctly.
 */
export function formatBps(bps: number): string {
  return `${parseFloat((bps / 100).toFixed(2))}%`;
}
