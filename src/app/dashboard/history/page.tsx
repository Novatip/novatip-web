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
import { analyticsApi, RECENT_TIPS_MAX_LIMIT } from "@/lib/api";
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

// Every request asks for one page, never the running total, so it stays
// within the backend's cap however far back the creator scrolls.
const PAGE_SIZE = Math.min(20, RECENT_TIPS_MAX_LIMIT);

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
  const [hasMore, setHasMore] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Each call fetches one page starting after the rows already shown and
  // appends it, so a load more costs one page rather than the whole history,
  // and existing rows are never replaced.
  const fetchPage = useCallback((offset: number) => {
    if (!jwt) return;
    setLoading(true);
    analyticsApi
      .recent(jwt, PAGE_SIZE, undefined, offset)
      .then((r) => {
        // A tip indexed between pages shifts the offset by one, which would
        // repeat the last row of the previous page — skip ids already shown.
        setTips((prev) => {
          const seen = new Set(prev.map((t) => t.id));
          return [...prev, ...r.tips.filter((t) => !seen.has(t.id))];
        });
        setHasMore(r.tips.length === PAGE_SIZE);
        setError(null);
        setPageError(null);
      })
      .catch((e: Error) => {
        // A failed later page must not replace the rows already shown with
        // a page-level error — report it beside the button so it can retry.
        if (offset === 0) setError(e.message);
        else setPageError("Couldn't load more tips. Try again.");
      })
      .finally(() => setLoading(false));
  }, [jwt]);

  useEffect(() => {
    setTips([]);
    setHasMore(true);
    setPageError(null);
    fetchPage(0);
  }, [fetchPage]);

  function loadMore() {
    if (loading) return;
    fetchPage(tips.length);
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

        {hasMore && tips.length > 0 && (
          <div className="pt-4 flex flex-col items-center gap-2">
            {pageError && <p className="text-xs text-red-400">{pageError}</p>}
            <Button
              variant="ghost"
              size="sm"
              loading={loading}
              onClick={loadMore}
            >
              {pageError ? "Retry" : "Load more"}
            </Button>
          </div>
        )}

        {!hasMore && tips.length > 0 && (
          <p className="pt-4 text-center text-xs text-gray-500">
            That&apos;s all your tips.
          </p>
        )}
      </Card>

    </div>
  );
}
