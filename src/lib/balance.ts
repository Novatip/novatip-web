/**
 * lib/balance.ts
 *
 * Reads a Stellar account's USDC balance via a read-only simulation of the
 * asset contract's `balance` call — the same probe trustline.ts uses to check
 * whether an account can receive USDC at all, just keeping the returned value
 * instead of only its success/failure.
 */

import { Contract, nativeToScVal, scValToNative, rpc } from "@stellar/stellar-sdk";
import { buildTransactionBuilder, createRpcServer } from "@novatip/sdk";
import { config } from "./config";
import { getNetworkConfig } from "./wallet";

/**
 * A source account is needed to build the envelope, but a read-only
 * simulation is never signed or submitted, so any valid address does — the
 * account being queried is itself the obvious choice.
 */
export async function getUsdcBalance(address: string): Promise<bigint> {
  const network = getNetworkConfig();
  const server  = createRpcServer(network);
  const token   = new Contract(config.stellar.usdcContractId);

  const builder = await buildTransactionBuilder(address, network, server);
  const tx = builder
    .addOperation(token.call("balance", nativeToScVal(address, { type: "address" })))
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim) || !sim.result) {
    throw new Error("Could not read USDC balance.");
  }

  return scValToNative(sim.result.retval) as bigint;
}
