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

import { rpc } from "@stellar/stellar-sdk";
import { shortenAddress } from "@novatip/sdk";
import { simulateUsdcBalance } from "./balance";

/**
 * Check whether an account can receive USDC by simulating a balance call.
 * Returns true if the simulation succeeds, false if it reports an error.
 */
export async function canReceiveUsdc(address: string): Promise<boolean> {
  const sim = await simulateUsdcBalance(address);
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

  const list = blocked.map((address) => shortenAddress(address)).join(", ");
  throw new Error(
    blocked.length === 1
      ? `${list} cannot receive USDC yet. That account needs to add a USDC ` +
          `trustline before it can be paid, otherwise every tip to this jar fails.`
      : `These accounts cannot receive USDC yet: ${list}. Each needs to add a ` +
          `USDC trustline before it can be paid, otherwise every tip to this jar fails.`,
  );
}
