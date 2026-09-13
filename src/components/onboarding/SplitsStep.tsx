"use client";

/**
 * onboarding/SplitsStep.tsx
 * Step 2 — configure collaborator splits, then register the jar on-chain.
 */

import { useState } from "react";
import { creatorApi } from "@/lib/api";
import { jarIdForSlug, syncJarToChain } from "@/lib/jar";
import { SplitsManager, type SplitRow } from "@/components/SplitsManager";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/contexts/WalletContext";

interface SplitsStepProps {
  slug:   string;
  onNext: () => void;
}

export function SplitsStep({ slug, onNext }: SplitsStepProps) {
  const { jwt, publicKey } = useWallet();
  const [defaulting, setDefaulting] = useState(false);
  const [defaultError, setDefaultError] = useState<string | null>(null);

  /**
   * The chain is written first and the backend second. The contract is what
   * decides whether a tip can be paid at all, so a creator row pointing at a
   * jar that was never registered is the one state worth ruling out — it is
   * exactly what made every tip to a UI-created jar fail with JarNotFound.
   * If the creator rejects the signature, nothing is persisted anywhere.
   */
  async function save(splits: SplitRow[]) {
    if (!jwt || !publicKey) return;
    await syncJarToChain({
      owner:  publicKey,
      jarId:  jarIdForSlug(slug),
      splits,
    });
    await creatorApi.updateSplits(jwt, splits);
    onNext();
  }

  /**
   * "Just me" is not a skip. The jar still has to exist on-chain before it can
   * receive anything, so this registers it with the whole allocation going to
   * the creator — one signature, same as any other split configuration.
   */
  async function handleJustMe() {
    if (!publicKey) return;
    setDefaulting(true);
    setDefaultError(null);
    try {
      await save([{ to: publicKey, bps: 10000 }]);
    } catch (err) {
      setDefaultError(
        err instanceof Error ? err.message : "Could not register your jar on-chain.",
      );
    } finally {
      setDefaulting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-fg mb-1">Set up splits</h2>
        <p className="text-sm text-fg-subtle">
          Optionally add collaborators. By default 100% goes to you.
        </p>
      </div>

      <SplitsManager
        initial={[{ to: publicKey ?? "", bps: 10000 }]}
        onSave={save}
        disabled={defaulting}
      />

      <p className="text-xs text-fg-faint text-center">
        Saving registers your jar on the Stellar network. Your wallet will ask
        you to sign, and the network charges a small XLM fee.
      </p>

      {defaultError && <p className="text-sm text-danger">{defaultError}</p>}

      <Button
        variant="ghost"
        size="sm"
        className="self-center"
        onClick={handleJustMe}
        loading={defaulting}
        disabled={defaulting || !publicKey}
      >
        {defaulting ? "Registering…" : "Just me — 100%"}
      </Button>
    </div>
  );
}
