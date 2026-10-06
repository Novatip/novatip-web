"use client";

/**
 * app/dashboard/splits/page.tsx
 *
 * Dashboard page for managing collaborator splits.
 * Loads the creator's current splits from the backend, renders
 * SplitsManager, and on submit writes the new splits to the contract and
 * then to the backend.
 */

import { useCallback, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { creatorApi, authApi, type CreatorProfile } from "@/lib/api";
import { syncJarToChain } from "@/lib/jar";
import { useAbortableRequest } from "@/hooks/useAbortableRequest";
import { SplitsManager, type SplitRow } from "@/components/SplitsManager";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ErrorPanel } from "@/components/ui/ErrorPanel";

export default function SplitsPage() {
  const { jwt, publicKey } = useWallet();
  const { data: creator, loading, error, run } = useAbortableRequest<CreatorProfile | null>(null);

  const fetchCreator = useCallback(() => {
    if (!jwt) return;
    // Fetch the creator profile via the auth/me + creator slug
    run((signal) =>
      authApi
        .me(jwt, { signal })
        .then((r) => creatorApi.getBySlug(r.user.slug, { signal }))
        .then((r) => r.creator),
    );
  }, [jwt, run]);

  useEffect(() => {
    fetchCreator();
  }, [fetchCreator]);

  /**
   * Splits are written to the contract before the backend, because the
   * contract is what actually divides an incoming tip — a backend row the
   * chain disagrees with sends money to the wrong people, and one pointing at
   * a jar that does not exist sends it nowhere at all.
   *
   * syncJarToChain registers the jar when it is missing, which is what makes
   * this page work for creators who claimed a slug before on-chain
   * registration existed. Their first save here creates the jar.
   */
  async function handleSave(splits: SplitRow[]) {
    if (!jwt || !creator || !publicKey) return;
    await syncJarToChain({
      owner:  publicKey,
      jarId:  creator.jarId,
      splits,
    });
    const result = await creatorApi.updateSplits(jwt, splits);
    run(async () => result.creator);
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-fg">Collaborator Splits</h1>
        <p className="text-sm text-fg-subtle mt-1">
          Define how each incoming tip is split between you and your collaborators.
          All basis points must total exactly 10,000 (100%).
        </p>
      </div>

      {error && (
        <ErrorPanel message={error} onRetry={fetchCreator} retrying={loading} />
      )}

      <Card>
        <CardHeader>
          <CardTitle level={2}>Split configuration</CardTitle>
        </CardHeader>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-1 h-10 rounded-xl bg-hairline" />
                <div className="w-28 h-10 rounded-xl bg-hairline" />
                <div className="w-6 h-10 rounded bg-hairline" />
              </div>
            ))}
          </div>
        ) : (
          <SplitsManager
            initial={(creator?.splits as SplitRow[]) ?? []}
            onSave={handleSave}
            connectedAddress={publicKey ?? undefined}
          />
        )}
      </Card>

      <div className="rounded-xl bg-surface-strong border border-hairline px-4 py-3">
        <p className="text-xs text-fg-faint">
          Changes are saved to the backend immediately. To update your on-chain splits,
          call <code className="text-accent">update_splits</code> on the tip_splitter
          contract using the Novatip SDK or the Stellar CLI.
        </p>
      </div>
    </div>
  );
}
