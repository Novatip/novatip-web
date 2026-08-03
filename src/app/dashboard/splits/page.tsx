"use client";

/**
 * app/dashboard/splits/page.tsx
 *
 * Dashboard page for managing collaborator splits.
 * Loads the creator's current splits from the backend, renders
 * SplitsManager, and saves changes to the backend on submit.
 */

import { useEffect, useState, useRef } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { creatorApi, authApi, type CreatorProfile } from "@/lib/api";
import { SplitsManager, type SplitRow } from "@/components/SplitsManager";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export default function SplitsPage() {
  const { jwt } = useWallet();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!jwt) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    // Fetch the creator profile via the auth/me + creator slug
    authApi
      .me(jwt, { signal: controller.signal })
      .then((r) => creatorApi.getBySlug(r.user.slug, { signal: controller.signal }))
      .then((r) => {
        setCreator(r.creator);
      })
      .catch((e: any) => {
        if (e.code === "ABORTED") return;
        setError(e.message);
      })
      .finally(() => {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setLoading(false);
        }
      });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [jwt]);

  async function handleSave(splits: SplitRow[]) {
    if (!jwt) return;
    const result = await creatorApi.updateSplits(jwt, splits);
    setCreator(result.creator);
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Collaborator Splits</h1>
        <p className="text-sm text-gray-400 mt-1">
          Define how each incoming tip is split between you and your collaborators.
          All basis points must total exactly 10,000 (100%).
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Split configuration</CardTitle>
        </CardHeader>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-1 h-10 rounded-xl bg-white/10" />
                <div className="w-28 h-10 rounded-xl bg-white/10" />
                <div className="w-6 h-10 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : (
          <SplitsManager
            initial={(creator?.splits as SplitRow[]) ?? []}
            onSave={handleSave}
          />
        )}
      </Card>

      <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <p className="text-xs text-gray-500">
          Changes are saved to the backend immediately. To update your on-chain splits,
          call <code className="text-brand-400">update_splits</code> on the tip_splitter
          contract using the Novatip SDK or the Stellar CLI.
        </p>
      </div>
    </div>
  );
}
