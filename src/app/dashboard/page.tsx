"use client";

/**
 * app/dashboard/page.tsx
 *
 * Creator dashboard overview:
 *   - Earnings summary cards (total tips, total USDC, unique supporters)
 *   - Recent tips live feed
 *   - Top supporters leaderboard
 */

import { useCallback, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { analyticsApi, authApi, creatorApi, type CreatorProfile } from "@/lib/api";
import { useAbortableRequest } from "@/hooks/useAbortableRequest";
import { formatUsdc } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { JarStatusBanner } from "@/components/JarStatusBanner";
import { Leaderboard } from "@/components/Leaderboard";
import { RecentTips } from "@/components/RecentTips";
import { TipChart } from "@/components/TipChart";

interface Totals {
  totalTips:        number;
  totalAmountRaw:   string;
  uniqueSupporters: number;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?:  string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs text-fg-faint uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-fg">{value}</p>
      {sub && <p className="text-xs text-fg-faint">{sub}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const { jwt } = useWallet();
  const { data: totals, loading, error, run } = useAbortableRequest<Totals | null>(null);

  // Only feeds the jar-registration check below. Its own failure isn't
  // surfaced — the rest of the page has already loaded via `totals` above,
  // and this is a nice-to-have on top of it, not a prerequisite for it.
  const { data: creator, run: runCreator } = useAbortableRequest<CreatorProfile | null>(null);

  const fetchTotals = useCallback(() => {
    if (!jwt) return;
    run((signal) => analyticsApi.totals(jwt, { signal }));
  }, [jwt, run]);

  useEffect(() => {
    fetchTotals();
  }, [fetchTotals]);

  useEffect(() => {
    if (!jwt) return;
    runCreator((signal) =>
      authApi
        .me(jwt, { signal })
        .then((r) => creatorApi.getBySlug(r.user.slug, { signal }))
        .then((r) => r.creator),
    );
  }, [jwt, runCreator]);

  const totalUsdc = totals
    ? formatUsdc(BigInt(totals.totalAmountRaw), 2)
    : "—";

  return (
    <div className="flex flex-col gap-8 animate-fade-in">

      {/* Page title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-fg">Overview</h1>
        <p className="text-sm text-fg-subtle">Your earnings and supporter activity</p>
        {creator && <JarStatusBanner jarId={creator.jarId} />}
      </div>

      {/* Error */}
      {error && (
        <ErrorPanel message={error} onRetry={fetchTotals} retrying={loading} />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Tips"
          value={loading ? "…" : String(totals?.totalTips ?? 0)}
          sub="all time"
        />
        <StatCard
          label="Total Earned"
          value={loading ? "…" : `$${totalUsdc}`}
          sub="USDC"
        />
        <StatCard
          label="Supporters"
          value={loading ? "…" : String(totals?.uniqueSupporters ?? 0)}
          sub="unique wallets"
        />
      </div>

      {/* Tip activity chart */}
      {jwt && <TipChart jwt={jwt} />}

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {jwt && <RecentTips jwt={jwt} />}
        {jwt && <Leaderboard jwt={jwt} />}
      </div>

    </div>
  );
}
