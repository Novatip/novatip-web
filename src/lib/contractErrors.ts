/**
 * lib/contractErrors.ts
 *
 * Readable messages for tip_splitter contract errors the pinned SDK does not
 * know yet.
 *
 * The SDK's errors.ts only covers codes 1–12, while the contract now defines
 * codes up to 39. A tip that fails with a newer code surfaces as a raw
 * "Error(Contract, #N)" with nothing a tipper can act on.
 *
 * TEMPORARY: remove this file (and its use in TipForm) once the pinned
 * @novatip/sdk commit includes these codes.
 */

/** Codes a tipper can hit, keyed by the contract's numeric error code. */
const CONTRACT_ERROR_MESSAGES: Record<number, string> = {
  // BelowMinTipAmount
  13: "This tip is below the minimum amount for this jar. Try a larger amount.",
  // ContractPaused
  33: "Tipping is temporarily paused. Please try again later.",
  // JarPaused
  39: "This jar is not accepting tips right now. Please try again later.",
};

const RAW_CONTRACT_ERROR = /Error\(Contract,\s*#(\d+)\)/;

/**
 * If the message carries a raw `Error(Contract, #N)` for a mapped code, return
 * the readable text. Otherwise return the message unchanged.
 */
export function describeContractError(message: string): string {
  const match = message.match(RAW_CONTRACT_ERROR);
  if (!match) return message;

  return CONTRACT_ERROR_MESSAGES[Number(match[1])] ?? message;
}
