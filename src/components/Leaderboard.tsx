"use client";

/**
 * Leaderboard.tsx
 *
 * Displays the top supporters ranked by total USDC sent.
 * Fetches on mount and re-fetches whenever a tip succeeds (via tipEvents).
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { analyticsApi } from "@/lib/api";
import { tipEvents } from "@/lib/tipEvents";
import { formatUsdc } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface Supporter {
  fromAddress:    string;
  tipCount:       number;
  totalAmountRaw: string;
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

const MEDALS = ["🥇", "🥈", "🥉"];

interface LeaderboardProps {
  jwt:    string;
  limit?: number;
}

export function Leaderboard({ jwt, limit = 10 }: LeaderboardProps) {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSupporters = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    analyticsApi
      .topSupporters(jwt, limit, { signal: controller.signal })
      .then((r) => {
        setSupporters(r.supporters);
        setError(null);
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
  }, [jwt, limit]);

  // Initial fetch
  useEffect(() => {
    fetchSupporters();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSupporters]);

  // Re-fetch whenever a tip succeeds — gives the leaderboard a chance to
  // update without waiting for a page reload.
  useEffect(() => {
    const unsub = tipEvents.subscribe(() => {
      fetchSupporters();
    });
    return () => {
      unsub();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSupporters]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Supporters</CardTitle>
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

      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}

      {!loading && !error && supporters.length === 0 && (
        <p className="text-sm text-fg-faint py-4 text-center">
          No supporters yet — share your tip link!
        </p>
      )}

      {!loading && !error && supporters.length > 0 && (
        <ol className="space-y-2" aria-label="Top supporters leaderboard">
          {supporters.map((s, i) => (
            <li
              key={s.fromAddress}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                i === 0 ? "bg-warning/10 border border-warning/20" : "hover:bg-surface-strong",
              )}
            >
              {/* Rank */}
              <span className="w-6 text-center text-sm" aria-label={`Rank ${i + 1}`}>
                {MEDALS[i] ?? <span className="text-fg-dim font-mono text-xs">{i + 1}</span>}
              </span>

              {/* Address */}
              <span className="flex-1 font-mono text-sm text-fg-muted truncate">
                {shortAddress(s.fromAddress)}
              </span>

              {/* Tip count */}
              <span className="text-xs text-fg-faint hidden sm:block">
                {s.tipCount} tip{s.tipCount !== 1 ? "s" : ""}
              </span>

              {/* Amount */}
              <span className="text-sm font-semibold text-accent shrink-0">
                ${formatUsdc(BigInt(s.totalAmountRaw), 2)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
