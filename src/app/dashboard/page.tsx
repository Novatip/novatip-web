"use client";

/**
 * app/dashboard/page.tsx
 *
 * Creator dashboard overview:
 *   - Earnings summary cards (total tips, total USDC, unique supporters)
 *   - Recent tips live feed
 *   - Top supporters leaderboard
 */

import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { analyticsApi } from "@/lib/api";
import { formatUsdc } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Leaderboard } from "@/components/Leaderboard";
import { RecentTips } from "@/components/RecentTips";

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
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const { jwt } = useWallet();
  const [totals,  setTotals]  = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!jwt) return;
    setLoading(true);
    analyticsApi
      .totals(jwt)
      .then(setTotals)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [jwt]);

  const totalUsdc = totals
    ? formatUsdc(BigInt(totals.totalAmountRaw), 2)
    : "—";

  return (
    <div className="flex flex-col gap-8 animate-fade-in">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-gray-400 mt-1">Your earnings and supporter activity</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
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

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {jwt && <RecentTips jwt={jwt} />}
        {jwt && <Leaderboard jwt={jwt} />}
      </div>

    </div>
  );
}
