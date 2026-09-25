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

export function isWithinTipCeiling(amount: string): boolean {
  const n = Number(amount);
  return Number.isFinite(n) && n <= MAX_CUSTOM_TIP_USDC;
}

export function isLargeTip(amount: string): boolean {
  const n = Number(amount);
  return Number.isFinite(n) && n >= LARGE_TIP_CONFIRM_USDC;
}
