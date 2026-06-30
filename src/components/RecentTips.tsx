"use client";

/**
 * RecentTips.tsx
 *
 * Live feed of the most recent tips on the creator's dashboard.
 * Polls every 15 seconds for fresh data.
 */

import { useEffect, useState, useCallback } from "react";
import { analyticsApi } from "@/lib/api";
import { formatUsdc } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Tip {
  id:          string;
  fromAddress: string;
  amount:      string;
  message:     string;
  ledgerAt:    string;
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const POLL_INTERVAL = 15_000;

interface RecentTipsProps {
  jwt:   string;
  limit?: number;
}

export function RecentTips({ jwt, limit = 20 }: RecentTipsProps) {
  const [tips,    setTips]    = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchTips = useCallback(() => {
    analyticsApi
      .recent(jwt, limit)
      .then((r) => { setTips(r.tips); setError(null); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [jwt, limit]);

  // Initial fetch + polling
  useEffect(() => {
    fetchTips();
    const interval = setInterval(fetchTips, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTips]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Tips</CardTitle>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-slow" />
            Live
          </span>
        </div>
      </CardHeader>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 rounded bg-white/10" />
                <div className="h-3 w-48 rounded bg-white/5" />
              </div>
              <div className="h-4 w-12 rounded bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {!loading && !error && tips.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">
          No tips yet — share your link to get started!
        </p>
      )}

      {!loading && !error && tips.length > 0 && (
        <ul className="space-y-3" aria-label="Recent tips feed">
          {tips.map((tip) => (
            <li key={tip.id} className="flex items-start gap-3">
              {/* Avatar placeholder */}
              <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs">💸</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  <span className="font-mono text-gray-400">
                    {shortAddress(tip.fromAddress)}
                  </span>
                  {" "}tipped{" "}
                  <span className="font-semibold text-brand-400">
                    ${formatUsdc(BigInt(tip.amount), 2)} USDC
                  </span>
                </p>
                {tip.message && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    "{tip.message}"
                  </p>
                )}
              </div>

              {/* Time */}
              <span className="text-xs text-gray-600 shrink-0 mt-0.5">
                {timeAgo(tip.ledgerAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
