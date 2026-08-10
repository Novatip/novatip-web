/**
 * src/test/mocks/novatip-sdk.ts
 *
 * Minimal stub of @novatip/sdk for the test environment.
 * Vitest resolves "@novatip/sdk" to this file via the alias in vitest.config.ts.
 *
 * Real rules reproduced faithfully so unit tests exercise the same
 * constraints as production code:
 *   - usdcToStroops   : 1 USDC = 10_000_000 stroops (7 decimal places)
 *   - isValidTipAmount: amount > 0 and <= 1_000 USDC in stroops
 *   - formatUsdc      : divide by 10^7, format to `decimals` places
 *   - validateSplitsBps: array must sum to exactly 10_000
 *   - shortenAddress  : first 5 chars + "..." + last 4 chars
 *                       e.g. "GABCD...WXYZ"
 */

export function usdcToStroops(usd: string): bigint {
  const [integer = "0", fraction = ""] = usd.split(".");
  const paddedFraction = fraction.padEnd(7, "0").slice(0, 7);
  return BigInt(integer) * 10_000_000n + BigInt(paddedFraction);
}

const MAX_STROOPS = 1_000n * 10_000_000n; // 1 000 USDC

export function isValidTipAmount(stroops: bigint): boolean {
  return stroops > 0n && stroops <= MAX_STROOPS;
}

export function formatUsdc(stroops: bigint, decimals = 2): string {
  const whole    = stroops / 10_000_000n;
  const fraction = stroops % 10_000_000n;
  const fracStr  = fraction.toString().padStart(7, "0").slice(0, decimals);
  return `${whole}.${fracStr}`;
}

export function validateSplitsBps(bpsArray: number[]): boolean {
  const total = bpsArray.reduce((sum, v) => sum + v, 0);
  return total === 10_000;
}

/**
 * Shorten a Stellar address for display.
 * Matches the format previously used by the three local shortAddress helpers:
 *   "GABCDEFG...WXYZ"  (first 5 chars, ellipsis, last 4 chars)
 *
 * The `prefixLength` and `suffixLength` params mirror the real SDK signature
 * so call sites that need a different truncation length don't need a local
 * helper — they just pass arguments.
 */
export function shortenAddress(
  address: string,
  prefixLength = 5,
  suffixLength = 4,
): string {
  if (address.length <= prefixLength + suffixLength) return address;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}
