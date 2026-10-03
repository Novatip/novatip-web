"use client";

/**
 * app/dashboard/history/page.tsx
 *
 * Full paginated tip history for the creator dashboard.
 * Shows all received tips in reverse chronological order with
 * sender address, amount, message, and ledger timestamp.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { analyticsApi, ApiError, RECENT_TIPS_MAX_LIMIT } from "@/lib/api";
import { formatUsdc } from "@novatip/sdk";
import { shortenAddress } from "@novatip/sdk";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";

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

export default function HistoryPage() {
  const { jwt }  = useWallet();
  const [tips,    setTips]    = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  // True only while a *later* page is in flight, so the button can say so
  // without the initial page load also flipping its label.
  const [loadingMore, setLoadingMore] = useState(false);
  // Announced politely after a page lands. Focus stays on the button, so this
  // is the only signal a screen reader user gets that rows were appended.
  const [announcement, setAnnouncement] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  // Each call fetches one page starting after the rows already shown and
  // appends it, so a load more costs one page rather than the whole history,
  // and existing rows are never replaced.
  const fetchPage = useCallback((offset: number) => {
    if (!jwt) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    if (offset > 0) setLoadingMore(true);
    analyticsApi
      .recent(jwt, PAGE_SIZE, { signal: controller.signal }, offset)
      .then((r) => {
        // A tip indexed between pages shifts the offset by one, which would
        // repeat the last row of the previous page — skip ids already shown.
        let added = 0;
        setTips((prev) => {
          const seen = new Set(prev.map((t) => t.id));
          const fresh = r.tips.filter((t) => !seen.has(t.id));
          added = fresh.length;
          return [...prev, ...fresh];
        });
        setHasMore(r.tips.length === PAGE_SIZE);
        setError(null);
        setPageError(null);
        // Only announce for appended pages; the first page is already
        // conveyed by the page itself loading.
        if (offset > 0) {
          setAnnouncement(
            added === 1
              ? "1 more tip loaded."
              : `${added} more tips loaded.`,
          );
        }
      })
      .catch((e: unknown) => {
        // Ignore aborted requests — component is unmounted or jwt changed.
        if (e instanceof ApiError && e.code === "ABORTED") return;
        const message = e instanceof Error ? e.message : "Something went wrong.";
        // A failed later page must not replace the rows already shown with
        // a page-level error — report it beside the button so it can retry.
        if (offset === 0) setError(message);
        else setPageError("Couldn't load more tips. Try again.");
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setLoading(false);
        }
      });
  }, [jwt]);

  useEffect(() => {
    setTips([]);
    setHasMore(true);
    setPageError(null);
    fetchPage(0);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPage]);

  function loadMore() {
    if (loading) return;
    fetchPage(tips.length);
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">Tip History</h1>
        <p className="text-sm text-fg-subtle mt-1">
          All tips received, newest first
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Table */}
      <Card glass={false}>
        <div role="table" aria-label="Tip history" className="w-full">
          {/* Column headers */}
          <div role="rowgroup">
            <div role="row" className="grid grid-cols-12 gap-4 pb-3 border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
              <span role="columnheader" className="col-span-4">From</span>
              <span role="columnheader" className="col-span-2 text-right">Amount</span>
              <span role="columnheader" className="col-span-4">Message</span>
              <span role="columnheader" className="col-span-2 text-right">When</span>
            </div>
          </div>

          {/* Loading skeletons */}
          {loading && tips.length === 0 && (
            <div role="rowgroup" className="divide-y divide-white/5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} role="row" className="grid grid-cols-12 gap-4 py-3 animate-pulse">
                  <div role="cell" className="col-span-4 h-4 rounded bg-white/10" />
                  <div role="cell" className="col-span-2 h-4 rounded bg-white/10" />
                  <div role="cell" className="col-span-4 h-4 rounded bg-white/5" />
                  <div role="cell" className="col-span-2 h-4 rounded bg-white/10" />
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
            <div role="rowgroup" className="divide-y divide-white/5">
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  role="row"
                  className="grid grid-cols-12 gap-4 py-3 hover:bg-white/3 transition-colors rounded-lg"
                >
                  {/* Sender */}
                  <span role="cell" className="col-span-4 font-mono text-sm text-gray-300 truncate">
                    {shortenAddress(tip.fromAddress)}
                  </span>

                  {/* Amount */}
                  <span role="cell" className="col-span-2 text-right text-sm font-semibold text-brand-400">
                    ${formatUsdc(BigInt(tip.amount), 2)}
                  </span>

                  {/* Message */}
                  <span role="cell" className={cn(
                    "col-span-4 text-sm truncate",
                    tip.message ? "text-gray-300" : "text-gray-600 italic",
                  )}>
                    {tip.message || "No message"}
                  </span>

                  {/* Time */}
                  <TimeAgo
                    iso={tip.ledgerAt}
                    className="col-span-2 text-right text-xs text-gray-500"
                  >
                    {timeAgo(tip.ledgerAt)}
                  </TimeAgo>
                </div>
              ))}
            </div>
          )}
        </div>

        {hasMore && tips.length > 0 && (
          <div className="pt-4 flex flex-col items-center gap-2">
            {pageError && <p className="text-xs text-danger">{pageError}</p>}
            <Button
              variant="ghost"
              size="sm"
              loading={loadingMore}
              onClick={loadMore}
            >
              {pageError ? "Retry" : loadingMore ? "Loading more…" : "Load more"}
            </Button>
          </div>
        )}

        {!hasMore && tips.length > 0 && (
          <p className="pt-4 text-center text-xs text-gray-500">
            {tips.length >= RECENT_TIPS_MAX_LIMIT
              ? `Showing all tips (${RECENT_TIPS_MAX_LIMIT} max)`
              : "That\u2019s all your tips."}
          </p>
        )}
      </Card>

    </div>
  );
}
