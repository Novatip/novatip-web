/**
 * lib/wallet.ts
 *
 * Wallet utilities for novatip-web.
 * Wraps @novatip/sdk FreighterAdapter and exposes helpers used by
 * the WalletContext and TipForm.
 */

import {
  FreighterAdapter,
  getNetwork,
  TipSplitterClient,
  usdcToStroops,
  type NetworkConfig,
} from "@novatip/sdk";
import { config } from "./config.js";

// ── Singleton instances ───────────────────────────────────────────────────────

export const freighter = new FreighterAdapter();

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
  return (txXdr: string) => freighter.signTransaction(txXdr, network.passphrase);
}

// ── Amount helper (re-export for convenience) ─────────────────────────────────
export { usdcToStroops };
