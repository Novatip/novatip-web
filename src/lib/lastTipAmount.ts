/**
 * lib/lastTipAmount.ts
 *
 * Remembers the supporter's last USDC tip amount per browser, so TipForm can
 * default to it on their next visit instead of always opening at the same
 * fallback amount. Purely a convenience — nothing here is ever trusted
 * without being re-validated, since it is easy to hand-edit or come from an
 * older version of the app that allowed different bounds.
 */

import { isValidTipAmount, usdcToStroops } from "@novatip/sdk";
import { isWithinTipCeiling } from "@/lib/tipAmount";

export const LAST_TIP_AMOUNT_STORAGE_KEY = "novatip_last_tip_amount";

/** Opened at this amount when nothing valid is stored yet. */
export const DEFAULT_TIP_AMOUNT = "2";

function isValidStoredAmount(value: string): boolean {
  try {
    return isValidTipAmount(usdcToStroops(value)) && isWithinTipCeiling(value);
  } catch {
    return false;
  }
}

/**
 * The supporter's last tip amount, or DEFAULT_TIP_AMOUNT when nothing is
 * stored, storage is unavailable (private mode, blocked cookies), or the
 * stored value no longer passes validation.
 */
export function getLastTipAmount(): string {
  if (typeof window === "undefined") return DEFAULT_TIP_AMOUNT;
  try {
    const raw = window.localStorage.getItem(LAST_TIP_AMOUNT_STORAGE_KEY);
    if (raw && isValidStoredAmount(raw)) return raw;
    return DEFAULT_TIP_AMOUNT;
  } catch {
    return DEFAULT_TIP_AMOUNT;
  }
}

/** Persist the amount just tipped, for next time. No-ops if storage is unavailable. */
export function storeLastTipAmount(amount: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_TIP_AMOUNT_STORAGE_KEY, amount);
  } catch {
    // Storage unavailable — the tip itself already succeeded either way.
  }
}
