/**
 * lib/txerror.ts
 *
 * Turning a rejected submission into something a person can act on.
 *
 * When the network refuses a transaction, the SDK surfaces the failure as the
 * base64 TransactionResult XDR — "Transaction submission failed:
 * AAAAAAAA+QT////6AAAAAA==". That is the whole diagnosis, and it is unreadable
 * without a decoder, so the same message gets reported as a mystery every time.
 */

import { xdr } from "@stellar/stellar-sdk";

/**
 * What each result code means for this app specifically.
 *
 * Keys are the names stellar-sdk gives the union arms (camelCase: txBadAuth),
 * which are not the SCREAMING_SNAKE names the protocol documents. The
 * documented spelling is kept in the message text so it stays searchable.
 */
const RESULT_MESSAGES: Record<string, string> = {
  txBadAuth:
    "the wallet signed with a different account than the transaction was built for " +
    "(txBAD_AUTH). Switch Freighter to the account that owns this jar, or reconnect " +
    "your wallet.",
  txBadAuthExtra: "the transaction carried a signature it did not need (txBAD_AUTH_EXTRA).",
  txBadSeq:
    "the account's sequence number moved on before this was submitted (txBAD_SEQ). " +
    "Try again.",
  txInsufficientBalance:
    "the account does not hold enough XLM to cover the transaction (txINSUFFICIENT_BALANCE).",
  txInsufficientFee: "the fee offered was below the network minimum (txINSUFFICIENT_FEE).",
  txNoAccount: "the source account does not exist on this network (txNO_ACCOUNT).",
  txTooLate: "the transaction's time bounds had already passed (txTOO_LATE).",
  txFailed: "one of the operations failed (txFAILED).",
};

/** Pull a base64 TransactionResult out of an error message, if there is one. */
function extractResultXdr(message: string): string | null {
  const match = message.match(/([A-Za-z0-9+/]{16,}={0,2})\s*$/);
  return match ? match[1]! : null;
}

/**
 * Decode a base64 TransactionResult to its result code name, or null if the
 * string is not one. Never throws — a failed decode must not replace the real
 * error with a parser error.
 */
export function decodeResultCode(base64: string): string | null {
  try {
    const result = xdr.TransactionResult.fromXDR(base64, "base64");
    return result.result().switch().name;
  } catch {
    return null;
  }
}

/**
 * Await a chain call, rewriting an XDR-only submission failure into prose.
 * Anything else passes through untouched.
 */
export async function describeSubmissionError<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (!(err instanceof Error)) throw err;

    const base64 = extractResultXdr(err.message);
    if (!base64) throw err;

    const code = decodeResultCode(base64);
    if (!code) throw err;

    const explanation = RESULT_MESSAGES[code] ?? `the network rejected it (${code}).`;
    throw new Error(`Transaction rejected: ${explanation}`);
  }
}
