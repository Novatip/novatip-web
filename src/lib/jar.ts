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
 *
 * ## On-chain write path
 *
 * When a creator registers or updates their jar splits, the following steps
 * occur in order. Each step exists because of a specific production failure
 * that showed up before the guard was added.
 *
 * ### 1. Active account assertion (lib/wallet.ts: assertActiveAccount)
 *
 * **What it does:** Confirms the Freighter extension has the same account
 * selected as the one stored in the session (the `owner` the transaction is
 * built for).
 *
 * **Failure it prevents:** Transaction rejection with `txBAD_AUTH`. The contract
 * requires `owner.require_auth()`, so a signature from a different key is refused
 * by the network. Without this check, the mismatch is only discovered after the
 * transaction is already signed and submitted, and the failure arrives as base64
 * XDR: accurate, but unreadable. A creator who switched Freighter accounts between
 * connecting and saving would see a cryptic error and retry, wasting fees.
 *
 * **When it was added:** After multiple production reports of `txBAD_AUTH` from
 * creators who had switched accounts in Freighter without reconnecting.
 *
 * ### 2. Recipient trustline check (lib/trustline.ts: assertRecipientsCanReceive)
 *
 * **What it does:** Simulates a USDC `balance()` call for every split recipient
 * to confirm each account has opted in to receive the asset. Probes run
 * concurrently.
 *
 * **Failure it prevents:** Tip failures at payment time. The `tip_splitter`
 * contract pays all recipients atomically, so one collaborator without a USDC
 * trustline fails the entire tip — and the person who sees that failure is the
 * supporter, who did nothing wrong and cannot fix it. Checking trustlines when
 * the jar is saved moves the error to the creator, who can act on it (ask the
 * collaborator to add the asset in Freighter) at the moment they can.
 *
 * **When it was added:** After a production tip failed because a newly added
 * collaborator had a fresh account with no trustlines, and the supporter
 * abandoned the tip after seeing the error.
 *
 * ### 3. Read the existing jar state (readJar)
 *
 * **What it does:** Calls `getJar(jarId)` on the contract to see if the jar
 * already exists and who owns it. Returns `null` for a `JarNotFound` error,
 * throws for anything else.
 *
 * **Why it's needed:** The client must decide whether to call `createJar` or
 * `updateSplits`. The decision cannot be made by the backend because it never
 * writes the chain, and it cannot be assumed based on whether the creator has
 * a database row (some old accounts have database records but no on-chain jar).
 * Reading the jar also catches a collision: if someone else already registered
 * this jar ID directly with the contract (possible because the contract is
 * shared across deployments and anyone may call it), the save is rejected
 * before the creator pays a fee for a guaranteed-failing update.
 *
 * **When it was added:** When on-chain registration was first implemented to
 * fix the "every jar is a database record with no contract state behind it" bug.
 * The ownership check was added later after a collision surfaced in staging.
 *
 * ### 4. Create or update the jar on-chain
 *
 * **What it does:** Calls `client.createJar()` if the jar does not exist, or
 * `client.updateSplits()` if it does. Returns `"unchanged"` without writing if
 * the on-chain splits already match the requested ones. Each call:
 * - Builds a Soroban transaction
 * - Simulates it against the network
 * - Prompts Freighter for a signature
 * - Submits the signed transaction to Stellar
 * - Awaits confirmation
 *
 * **Why the chain is written before the backend:** The contract is the authority
 * for what gets paid. If the backend update succeeded but the chain write failed,
 * every tip would pay the old splits (or fail entirely if the jar was never
 * registered), and the creator would see correct splits in the dashboard while
 * supporters paid the wrong people. Writing the chain first ensures that the
 * worst-case failure (backend update fails after the chain succeeds) leaves the
 * tip flow working correctly, even if the dashboard shows stale data until the
 * creator retries.
 *
 * **When it was added:** This ordering was chosen from the start of the on-chain
 * write implementation. The opposite order was never shipped.
 *
 * ### 5. Error translation (lib/txerror.ts: describeSubmissionError)
 *
 * **What it does:** Wraps the chain call and rewrites any submission failure
 * into a readable message. A rejection from the network arrives as base64
 * TransactionResult XDR (e.g., "AAAAAAAA+QT////6AAAAAA=="). The wrapper decodes
 * the result code (`txBAD_AUTH`, `txINSUFFICIENT_BALANCE`, etc.) and replaces
 * it with prose explaining what went wrong and what the creator can do.
 *
 * **Failure it prevents:** Cryptic errors that cannot be acted on. Without this,
 * a creator who ran out of XLM would see "Transaction submission failed:
 * AAAAAAAA..." and have no idea what it meant or how to fix it.
 *
 * **When it was added:** After the first production report of a decoded XDR
 * error being filed as a bug because the creator did not know the app expected
 * it to be readable.
 *
 * ### Modules involved
 *
 * - `lib/jar.ts` (this file): orchestrates the full write path
 * - `lib/wallet.ts`: Freighter integration and active account guard
 * - `lib/trustline.ts`: recipient USDC trustline check
 * - `lib/txerror.ts`: submission error translation
 * - `@novatip/sdk`: TipSplitterClient, transaction building and simulation
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
