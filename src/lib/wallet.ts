/**
 * lib/wallet.ts
 *
 * Wallet utilities for novatip-web.
 * Talks to Freighter through @stellar/freighter-api directly rather than the
 * SDK's FreighterAdapter. The adapter loads the package with
 * `new Function("return import(specifier)")` to keep tsup's DTS step from
 * resolving an optional peer dependency — but a runtime import of a bare
 * specifier has no meaning in a bundled browser app, so it always throws
 * "Freighter API not found". The direct import is resolved at build time and
 * simply works.
 */

import {
  getNetwork,
  TipSplitterClient,
  usdcToStroops,
  type NetworkConfig,
} from "@novatip/sdk";
import {
  isConnected,
  requestAccess,
  signMessage,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";
import { config } from "./config";

// ── Extension detection ───────────────────────────────────────────────────────

/**
 * Whether the Freighter extension is present.
 *
 * Must be async, and must go through Freighter's own `isConnected()`. The SDK
 * adapter's `isAvailable()` does a synchronous `window.freighter` check, which
 * is wrong twice over: the extension injects asynchronously, so a check during
 * render can run before it lands, and that is not the object it injects.
 *
 * freighter-api v2 resolves to a bare boolean; v3+ resolves to an
 * `{ isConnected }` object. Accept either so upgrading cannot silently break
 * detection. Never throws — a missing extension is an ordinary state, not an
 * error.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result: unknown = await isConnected();
    if (typeof result === "boolean") return result;
    if (result && typeof result === "object" && "isConnected" in result) {
      return Boolean((result as { isConnected: unknown }).isConnected);
    }
    return false;
  } catch {
    return false;
  }
}

export function getNetworkConfig(): NetworkConfig {
  return getNetwork(config.stellar.network);
}

export function getTipSplitterClient(): TipSplitterClient {
  return new TipSplitterClient({
    contractId: config.stellar.tipSplitterContractId,
    network:    getNetworkConfig(),
  });
}

// ── Sign helper ───────────────────────────────────────────────────────────────

/**
 * Returns a signTransaction callback bound to the Freighter adapter
 * and the current network passphrase. Passed directly into SDK client methods.
 */
export function makeSignTransaction() {
  const network = getNetworkConfig();
  return async (txXdr: string): Promise<string> => {
    const { signedTxXdr, error } = await freighterSignTransaction(txXdr, {
      networkPassphrase: network.passphrase,
    });
    if (error) throw new Error(freighterMessage(error, "Transaction signing failed."));
    if (!signedTxXdr) throw new Error("Wallet did not return a signed transaction.");
    return signedTxXdr;
  };
}

/**
 * Prompt for access and return the connected account.
 *
 * requestAccess() shows Freighter's approval dialog the first time and
 * resolves to the public key on subsequent calls, so it covers both the
 * first connect and a reconnect.
 */
export async function connectFreighter(): Promise<string> {
  const { address, error } = await requestAccess();
  if (error) throw new Error(freighterMessage(error, "Freighter rejected the connection."));
  if (!address) {
    throw new Error("Freighter did not return an account. Approve the connection and try again.");
  }
  return address;
}

// ── Amount helper (re-export for convenience) ─────────────────────────────────
export { usdcToStroops };

// ── Sign-in message helper ───────────────────────────────────────────────────

/**
 * Signs a SIWS nonce as a plain message (not a transaction) and returns the
 * detached Ed25519 signature as hex. verifyEd25519 on the backend checks the
 * signature against the raw nonce bytes, so it must never be wrapped in a
 * transaction envelope.
 */
export async function signNonce(nonce: string, accountToSign: string): Promise<string> {
  // signBlob was removed in freighter-api v4; signMessage replaces it. The
  // signature comes back base64 on v4+ and as a Buffer on v3, so normalise
  // both to the hex the backend's verifyEd25519 expects.
  const { signedMessage, error } = await signMessage(nonce, { address: accountToSign });
  if (error) throw new Error(freighterMessage(error, "Message signing failed."));
  if (!signedMessage) throw new Error("Wallet did not return a signature.");

  if (typeof signedMessage === "string") return base64ToHex(signedMessage);
  return Buffer.from(signedMessage).toString("hex");
}

/** Freighter errors are objects; pull out something readable. */
function freighterMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

function base64ToHex(base64: string): string {
  const binary = atob(base64);
  let hex = "";
  for (let i = 0; i < binary.length; i++) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}
