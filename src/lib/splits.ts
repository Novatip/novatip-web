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

/** Total basis points a jar's splits must add up to (100%). */
export const TOTAL_BPS = 10_000;

/**
 * Divide 10,000 bps across `count` rows. The remainder is handed out one bps
 * at a time to the first rows, so the result always sums to exactly 10,000:
 *   - 3 rows → [3334, 3333, 3333]
 *   - 7 rows → [1429, 1429, 1429, 1429, 1428, 1428, 1428]
 *
 * Returns an empty array when `count` is not a positive integer.
 */
export function splitEqually(count: number): number[] {
  if (!Number.isInteger(count) || count < 1) return [];
  const base = Math.floor(TOTAL_BPS / count);
  const remainder = TOTAL_BPS - base * count;
  return Array.from({ length: count }, (_, i) => (i < remainder ? base + 1 : base));
}
