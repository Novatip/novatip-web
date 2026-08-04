"use client";

/**
 * onboarding/SplitsStep.tsx
 * Step 2 — configure collaborator splits (optional, can skip).
 */

import { creatorApi } from "@/lib/api";
import { SplitsManager, type SplitRow } from "@/components/SplitsManager";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/contexts/WalletContext";

interface SplitsStepProps {
  slug:   string;
  onNext: () => void;
}

export function SplitsStep({ slug, onNext }: SplitsStepProps) {
  const { jwt, publicKey } = useWallet();

  async function handleSave(splits: SplitRow[]) {
    if (!jwt) return;
    await creatorApi.updateSplits(jwt, splits);
    onNext();
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
        onSave={handleSave}
      />

      <Button variant="ghost" size="sm" className="self-center" onClick={onNext}>
        Skip for now
      </Button>
    </div>
  );
}
