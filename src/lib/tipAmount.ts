/**
 * lib/tipAmount.ts
 *
 * App-level guardrails for the custom tip amount, on top of whatever the SDK
 * itself considers valid. Presets top out at $25 — well under both numbers
 * below — so only the custom field is ever affected, which is also where a
 * typo (5 → 500) is most likely.
 */

/** Hard ceiling on a single custom tip. The SDK has no upper bound of its own. */
export const MAX_CUSTOM_TIP_USDC = 1000;

/** At or above this, the tip form asks the supporter to confirm before signing. */
export const LARGE_TIP_CONFIRM_USDC = 100;

/**
 * Validates that an input is a plain, non-negative decimal number string.
 * Rejects empty strings, whitespace, negative numbers, hex notation, and exponents.
 */
export function isValidPlainDecimal(amount: unknown): boolean {
  if (typeof amount !== 'string') return false;
  // Regex matches 1+ digits optionally followed by a dot and 1+ digits, or just digits.
  // Strictly disallows negative signs, '0x', 'e' exponents, or whitespace.
  const plainDecimalRegex = /^\d+(\.\d+)?$/;
  return plainDecimalRegex.test(amount.trim());
}

export function isWithinTipCeiling(amount: unknown, ceiling: number = MAX_CUSTOM_TIP_USDC): boolean {
  if (!isValidPlainDecimal(amount)) return false;
  const num = Number(amount);
  return num >= 0 && num <= ceiling;
}

export function isLargeTip(amount: unknown, threshold: number = LARGE_TIP_CONFIRM_USDC): boolean {
  if (!isValidPlainDecimal(amount)) return false;
  const num = Number(amount);
  return num >= threshold;
}
