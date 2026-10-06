"use client";

/**
 * Leaderboard.tsx
 *
 * Displays the top supporters ranked by total USDC sent.
 * Fetches on mount and re-fetches whenever a tip succeeds (via tipEvents).
 */

import { useCallback, useEffect } from "react";
import { analyticsApi } from "@/lib/api";
import { tipEvents, type TipSuccessPayload } from "@/lib/tipEvents";
import { useAbortableRequest } from "@/hooks/useAbortableRequest";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { formatUsdc, shortenAddress } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface Supporter {
  fromAddress: string;
  tipCount: number;
  totalAmountRaw: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

interface LeaderboardProps {
  jwt: string;
  limit?: number;
  /**
   * Slug of the creator this leaderboard belongs to. When set, tip events
   * for other creators on the same page are ignored instead of triggering
   * a refetch.
   */
  slug?: string;
}

export function Leaderboard({ jwt, limit = 10, slug }: LeaderboardProps) {
  const { data: supporters, loading, error, run } = useAbortableRequest<Supporter[]>([]);

  const fetchSupporters = useCallback(() => {
    run((signal) =>
      analyticsApi.topSupporters(jwt, limit, { signal }).then((r) => r.supporters),
    );
  }, [jwt, limit, run]);

  // Initial fetch
  useEffect(() => {
    fetchSupporters();
  }, [fetchSupporters]);

  // Re-fetch whenever a tip succeeds — gives the leaderboard a chance to
  // update without waiting for a page reload. Ignore tips for other
  // creators so a shared page session doesn't trigger needless requests.
  useEffect(() => {
    const unsub = tipEvents.subscribe((payload: TipSuccessPayload) => {
      if (slug && payload.slug !== slug) return;
      fetchSupporters();
    });
    return unsub;
  }, [fetchSupporters, slug]);

  return (
    <Card>
      <CardHeader>
        <CardTitle level={2}>Top Supporters</CardTitle>
      </CardHeader>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-hairline" />
              <div className="flex-1 h-4 rounded bg-hairline" />
              <div className="h-4 w-16 rounded bg-hairline" />
            </div>
          ))}
        </div>
      )}

      {/* Non-blocking error notice — shown above the list so stale data remains visible */}
      {error && (
        <p className="text-sm text-danger mb-3" role="alert">{error}</p>
      )}

      {!loading && supporters.length === 0 && (
        <p className="text-sm text-fg-faint py-4 text-center">
          No supporters yet — share your tip link!
        </p>
      )}

      {!loading && supporters.length > 0 && (
        <ol className="space-y-2" aria-label="Top supporters leaderboard">
          {supporters.map((s, i) => (
            <SupporterRow key={s.fromAddress} supporter={s} rank={i} />
          ))}
        </ol>
      )}
    </Card>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function SupporterRow({ supporter, rank }: { supporter: Supporter; rank: number }) {
  const { copied, failed, copy } = useCopyToClipboard();

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
        rank === 0 ? "bg-warning/10 border border-warning/20" : "hover:bg-surface-strong",
      )}
    >
      {/* Rank. The medal is decoration on top of the rank, so it is hidden from
          assistive technology — otherwise the first row announces both the
          label and the emoji, e.g. "Rank 1, first place medal". */}
      <span className="w-6 text-center text-sm" aria-label={`Rank ${rank + 1}`}>
        <span aria-hidden="true">
          {MEDALS[rank] ?? <span className="text-fg-dim font-mono text-xs">{rank + 1}</span>}
        </span>
      </span>

      {/* Address + copy control */}
      <span className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="font-mono text-sm text-fg-muted truncate">
          {shortenAddress(supporter.fromAddress)}
        </span>
        <button
          type="button"
          onClick={() => void copy(supporter.fromAddress)}
          className={cn(
            "shrink-0 rounded-md p-1 text-xs transition-colors",
            "hover:bg-hairline focus:outline-none focus:ring-2 focus:ring-brand-500/50",
            failed ? "text-danger" : copied ? "text-success" : "text-fg-faint hover:text-fg",
          )}
          aria-label={
            copied
              ? "Full address copied"
              : failed
              ? "Couldn't copy address — try again"
              : `Copy full address ${supporter.fromAddress}`
          }
        >
          {copied ? "✓" : failed ? "✕" : "📋"}
        </button>
      </span>

      {/* Tip count */}
      <span className="text-xs text-fg-faint hidden sm:block">
        {supporter.tipCount} tip{supporter.tipCount !== 1 ? "s" : ""}
      </span>

      {/* Amount */}
      <span className="text-sm font-semibold text-accent shrink-0">
        ${formatUsdc(BigInt(supporter.totalAmountRaw), 2)}
      </span>
    </li>
  );
}
