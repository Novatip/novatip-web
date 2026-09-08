"use client";

/**
 * app/dashboard/history/page.tsx
 *
 * Full paginated tip history for the creator dashboard.
 * Shows all received tips in reverse chronological order with
 * sender address, amount, message, and ledger timestamp.
 */

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { analyticsApi } from "@/lib/api";
import { formatUsdc } from "@novatip/sdk";
import { shortenAddress } from "@novatip/sdk";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface Tip {
  id:          string;
  fromAddress: string;
  amount:      string;
  message:     string;
  ledgerAt:    string;
}

const PAGE_SIZE = 20;

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

export default function HistoryPage() {
  const { jwt }  = useWallet();
  const [tips,    setTips]    = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [limit,   setLimit]   = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);

  const fetchTips = useCallback((currentLimit: number) => {
    if (!jwt) return;
    setLoading(true);
    analyticsApi
      .recent(jwt, currentLimit)
      .then((r) => {
        // Append only new items — avoids re-downloading every page and
        // preserves scroll position.
        setTips((prev) => {
          const newItems = r.tips.slice(prev.length);
          return [...prev, ...newItems];
        });
        setHasMore(r.tips.length === currentLimit);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [jwt]);

  useEffect(() => {
    fetchTips(limit);
  }, [fetchTips, limit]);

  // Backend caps limit at 100 — cap on the client side so we never send
  // an invalid request. Disable the button once we hit the cap.
  const BACKEND_MAX = 100;
  const atLimit = limit >= BACKEND_MAX;

  function loadMore() {
    if (atLimit) return;
    const next = Math.min(limit + PAGE_SIZE, BACKEND_MAX);
    setLimit(next);
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Tip History</h1>
        <p className="text-sm text-gray-400 mt-1">
          All tips received, newest first
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <Card glass={false}>
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-4 pb-3 border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
          <span className="col-span-4">From</span>
          <span className="col-span-2 text-right">Amount</span>
          <span className="col-span-4">Message</span>
          <span className="col-span-2 text-right">When</span>
        </div>

        {/* Loading skeletons */}
        {loading && tips.length === 0 && (
          <div className="divide-y divide-white/5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 py-3 animate-pulse">
                <div className="col-span-4 h-4 rounded bg-white/10" />
                <div className="col-span-2 h-4 rounded bg-white/10" />
                <div className="col-span-4 h-4 rounded bg-white/5" />
                <div className="col-span-2 h-4 rounded bg-white/10" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && tips.length === 0 && !error && (
          <p className="text-sm text-gray-500 py-8 text-center">
            No tips received yet. Share your link to get started!
          </p>
        )}

        {/* Tip rows */}
        {tips.length > 0 && (
          <div className="divide-y divide-white/5">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="grid grid-cols-12 gap-4 py-3 hover:bg-white/3 transition-colors rounded-lg"
              >
                {/* Sender */}
                <span className="col-span-4 font-mono text-sm text-gray-300 truncate">
                  {shortenAddress(tip.fromAddress)}
                </span>

                {/* Amount */}
                <span className="col-span-2 text-right text-sm font-semibold text-brand-400">
                  ${formatUsdc(BigInt(tip.amount), 2)}
                </span>

                {/* Message */}
                <span className={cn(
                  "col-span-4 text-sm truncate",
                  tip.message ? "text-gray-300" : "text-gray-600 italic",
                )}>
                  {tip.message || "No message"}
                </span>

                {/* Time */}
                <span className="col-span-2 text-right text-xs text-gray-500">
                  {timeAgo(tip.ledgerAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* {atLimit ? "Showing all tips (100 max)" : "Load more"} */}
        {hasMore && tips.length > 0 && (
          <div className="pt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              loading={loading}
              onClick={loadMore} disabled={atLimit}
            >
              Load more
            </Button>
          </div>
        )}
      </Card>

    </div>
  );
}
