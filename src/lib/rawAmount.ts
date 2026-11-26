/**
 * lib/rawAmount.ts
 *
 * Shared utilities for parsing and formatting raw amount strings (stroops).
 * Raw amounts from the backend are strings representing integer stroops
 * (1 USDC = 10_000_000 stroops).
 */

import { formatUsdc } from "@novatip/sdk";

/**
 * Parse a raw amount string safely.
 *
 * @param raw - The raw amount string (stroops)
 * @returns bigint if parseable, null otherwise
 */
export function parseRawAmount(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

/**
 * Format a raw amount string as USDC with the specified decimal places.
 * Returns a dash ("—") if the value cannot be parsed.
 *
 * @param raw - The raw amount string (stroops)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted USDC string or "—" for invalid values
 */
export function formatRawUsdc(raw: string, decimals = 2): string {
  const amount = parseRawAmount(raw);
  return amount !== null ? formatUsdc(amount, decimals) : "—";
}
