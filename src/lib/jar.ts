/**
 * lib/jar.ts
 *
 * On-chain jar registration.
 *
 * The backend deliberately never writes to the contract. Only the creator's
 * own wallet can authorise `create_jar` — `owner.require_auth()` — and the
 * backend holds no keys, so registration has to happen client side. That was
 * always the intended split (see the step 3 note in creator.service.ts), but
 * nothing ever performed the on-chain half: onboarding wrote a creator row and
 * stopped. Every jar made through the UI was a database record with no jar
 * behind it, and the first tip to one failed with JarNotFound.
 */

import {
  ContractErrorCode,
  NovatipContractError,
  type Jar,
  type Split,
} from "@novatip/sdk";
import { assertActiveAccount, getTipSplitterClient, makeSignTransaction } from "./wallet";
import { describeSubmissionError } from "./txerror";
import { assertRecipientsCanReceive } from "./trustline";

/**
 * The on-chain jar ID for a slug. Mirrors `jarIdForSlug` in the backend — the
 * "@" belongs to the jar ID, not to the web URL.
 */
export function jarIdForSlug(slug: string): string {
  return `@${slug}`;
}

/**
 * A jar the contract has no record of is a normal, expected state during
 * onboarding, not an error — so it reads as null rather than throwing.
 *
 * The contract error arrives as a typed NovatipContractError when the SDK can
 * parse the host error out of the simulation. A raw simulation failure can
 * still surface as a plain message, so the diagnostic string is matched too.
 */
export async function readJar(jarId: string): Promise<Jar | null> {
  try {
    return await getTipSplitterClient().getJar(jarId);
  } catch (err) {
    if (isJarNotFound(err)) return null;
    throw err;
  }
}

function isJarNotFound(err: unknown): boolean {
  if (err instanceof NovatipContractError) {
    return err.code === ContractErrorCode.JarNotFound;
  }
  return err instanceof Error && /Error\(Contract,\s*#3\)/.test(err.message);
}

/** Splits are equal when the same addresses hold the same shares, in order. */
function sameSplits(a: readonly Split[], b: readonly Split[]): boolean {
  return (
    a.length === b.length &&
    a.every((split, i) => split.to === b[i]!.to && split.bps === b[i]!.bps)
  );
}

export type JarSyncResult = "created" | "updated" | "unchanged";

/**
 * Make the contract agree with `splits`, registering the jar if it is absent.
 *
 * Idempotent on purpose. It is called from onboarding and from the dashboard
 * splits editor, and it also repairs jars claimed before on-chain registration
 * existed: those have a database row and no jar, so the first save creates one
 * instead of failing to update something that was never there.
 *
 * Each branch that touches the chain costs the creator a wallet signature and
 * a small XLM fee, so an unchanged jar returns early rather than paying for a
 * write that would change nothing.
 */
export async function syncJarToChain(opts: {
  owner:  string;
  jarId:  string;
  splits: Split[];
}): Promise<JarSyncResult> {
  // Checked before anything is built or signed: the contract authorises
  // create_jar and update_splits against the owner, so a transaction signed by
  // a different active account is rejected by the network, not by the wallet.
  await assertActiveAccount(opts.owner);

  // Checked before the jar is written, not when a tip arrives. The contract
  // pays every recipient atomically, so one untrusted account breaks every
  // tip to this jar — and it breaks it for the tipper, who cannot fix it.
  await assertRecipientsCanReceive(opts.splits.map((s) => s.to));

  const client          = getTipSplitterClient();
  const signTransaction = makeSignTransaction(opts.owner);
  const existing        = await readJar(opts.jarId);

  if (!existing) {
    await describeSubmissionError(
      client.createJar(
        { owner: opts.owner, jarId: opts.jarId, splits: opts.splits },
        { signTransaction },
      ),
    );
    return "created";
  }

  // Someone else already owns this jar id on-chain. The backend's slug
  // uniqueness cannot catch this: the contract is shared across deployments
  // and anyone may register a jar id directly.
  if (existing.owner !== opts.owner) {
    throw new Error(
      `The jar "${opts.jarId}" is already registered to a different wallet on-chain.`,
    );
  }

  if (sameSplits(existing.splits, opts.splits)) return "unchanged";

  await describeSubmissionError(
    client.updateSplits(
      { jarId: opts.jarId, splits: opts.splits },
      { signTransaction, owner: opts.owner },
    ),
  );
  return "updated";
}
