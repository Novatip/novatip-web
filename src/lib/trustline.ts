/**
 * lib/trustline.ts
 *
 * Whether an account is able to receive the tip asset at all.
 *
 * On Stellar an account cannot hold an asset it has not explicitly trusted,
 * and tip_splitter pays every recipient in one atomic call — so a single
 * collaborator without a USDC trustline fails the whole tip. The person who
 * sees that failure is the tipper, who did nothing wrong and cannot fix it.
 *
 * Checking at the point splits are saved moves the error to the creator, who
 * can act on it, at the moment they can.
 *
 * The probe is the asset contract's own `balance`, which fails with the same
 * Error(Contract, #13) that the transfer would — so this tests the exact
 * condition that breaks the tip, rather than a proxy for it.
 */

import { Contract, nativeToScVal, rpc } from "@stellar/stellar-sdk";
import { buildTransactionBuilder, createRpcServer } from "@novatip/sdk";
import { config } from "./config";
import { getNetworkConfig } from "./wallet";

/**
 * A source account is needed to build the envelope, but a read-only
 * simulation is never signed or submitted, so any valid address does — the
 * account being probed is itself the obvious choice.
 */
export async function canReceiveUsdc(address: string): Promise<boolean> {
  const network = getNetworkConfig();
  const server  = createRpcServer(network);
  const token   = new Contract(config.stellar.usdcContractId);

  const builder = await buildTransactionBuilder(address, network, server);
  const tx = builder
    .addOperation(token.call("balance", nativeToScVal(address, { type: "address" })))
    .build();

  const sim = await server.simulateTransaction(tx);
  return !rpc.Api.isSimulationError(sim);
}

/**
 * Reject a split configuration that names a recipient who cannot be paid.
 *
 * Recipients are probed concurrently: a jar may have up to twenty, and doing
 * them in series would put a visible delay in front of the save button.
 *
 * A probe that fails for any other reason — RPC down, address never funded —
 * is deliberately not treated as "cannot receive". Blocking a save on a
 * transient network problem would be worse than letting the contract decide.
 *
 * `probe` is injectable so the branching can be tested without a network.
 */
export async function assertRecipientsCanReceive(
  recipients: readonly string[],
  probe: (address: string) => Promise<boolean> = canReceiveUsdc,
): Promise<void> {
  const unique = [...new Set(recipients)];

  const results = await Promise.all(
    unique.map(async (address) => {
      try {
        return { address, ok: await probe(address) };
      } catch {
        return { address, ok: true };
      }
    }),
  );

  const blocked = results.filter((r) => !r.ok).map((r) => r.address);
  if (blocked.length === 0) return;

  const list = blocked.map(shorten).join(", ");
  throw new Error(
    blocked.length === 1
      ? `${list} cannot receive USDC yet. That account needs to add a USDC ` +
          `trustline before it can be paid, otherwise every tip to this jar fails.`
      : `These accounts cannot receive USDC yet: ${list}. Each needs to add a ` +
          `USDC trustline before it can be paid, otherwise every tip to this jar fails.`,
  );
}

function shorten(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
