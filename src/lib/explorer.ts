/**
 * lib/explorer.ts
 *
 * Helper to build stellar.expert URLs for the configured network.
 *
 * stellar.expert is the canonical Stellar block explorer. It supports both
 * testnet and mainnet (public), and the URL structure is straightforward:
 *   https://stellar.expert/explorer/testnet/account/{address}
 *   https://stellar.expert/explorer/public/account/{address}
 *
 * The network name in the URL is "public" for mainnet, not "mainnet", so
 * the helper maps config.stellar.network to the explorer's naming.
 */

import { config } from "./config";

/**
 * Build a stellar.expert URL for the given address on the configured network.
 *
 * @param address - Stellar public key (G...) to link to
 * @returns Full URL to the account page on stellar.expert
 */
export function getExplorerUrl(address: string): string {
  // stellar.expert uses "public" for mainnet, not "mainnet"
  const networkSegment = config.stellar.network === "mainnet" ? "public" : config.stellar.network;
  return `https://stellar.expert/explorer/${networkSegment}/account/${address}`;
}
