"use client";

/**
 * RecentTips.tsx
 *
 * Live feed of the most recent tips on the creator's dashboard.
 *
 * Polling strategy:
 *   - Normal cadence: every 15 seconds.
 *   - After a successful tip is emitted by TipForm, switch to a fast
 *     polling window (every 3 seconds for up to 30 seconds) so the
 *     indexed entry appears as quickly as possible, then fall back.
 *
 * Optimistic updates:
 *   - On tip success an optimistic "confirming…" entry is prepended
 *     immediately so the supporter sees their tip right away.
 *   - Once the indexed version arrives (matched by fromAddress + amount)
 *     the optimistic entry is replaced — no duplicate.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { analyticsApi } from "@/lib/api";
import { tipEvents, type TipSuccessPayload } from "@/lib/tipEvents";
import { formatUsdc } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// ── Types ─────────────────────────────────────────────────────────────────────

interface IndexedTip {
  kind:        "indexed";
  id:          string;
  fromAddress: string;
  amount:      string; // raw stroops string from API
  message:     string;
  ledgerAt:    string;
}

interface PendingTip {
  kind:        "pending";
  /** Unique client-side id — never collides with real indexed ids. */
  id:          string;
  fromAddress: string;
  /** Dollar amount string from TipForm, e.g. "2" */
  displayAmount: string;
  message:     string;
}

type FeedEntry = IndexedTip | PendingTip;

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddress(addr: string): string {
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Merge a fresh list of indexed tips with any still-pending optimistic entries.
 *
 * An optimistic entry is considered "confirmed" (and therefore removed) when
 * the indexed list contains a tip from the same address where the raw amount
 * corresponds to the same dollar value the user sent.  We use a loose match
 * (same address, amount ≥ optimistic) to survive rounding and split scenarios.
 */
function mergeWithPending(
  indexed: IndexedTip[],
  pending: PendingTip[],
): FeedEntry[] {
  // Build a set of fromAddresses that now appear in the indexed list so we
  // can drop any pending entry whose on-chain confirmation arrived.
  const confirmedAddresses = new Set(indexed.map((t) => t.fromAddress));

  const stillPending = pending.filter(
    (p) => !confirmedAddresses.has(p.fromAddress),
  );

  // Pending entries go at the top (they are always the newest)
  return [...stillPending, ...indexed];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NORMAL_INTERVAL = 15_000; // 15 s — steady-state
const FAST_INTERVAL   =  3_000; // 3 s  — right after a tip
const FAST_WINDOW_MS  = 30_000; // stay fast for 30 s

// ── Component ─────────────────────────────────────────────────────────────────

interface RecentTipsProps {
  jwt:    string;
  limit?: number;
}

export function RecentTips({ jwt, limit = 20 }: RecentTipsProps) {
  const [indexedTips, setIndexedTips] = useState<IndexedTip[]>([]);
  const [pendingTips, setPendingTips] = useState<PendingTip[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const fastUntilRef = useRef<number | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep a ref to pendingTips so the fetch callback can read the latest value
  // without being re-created every time pendingTips changes.
  const pendingRef = useRef<PendingTip[]>([]);
  useEffect(() => { pendingRef.current = pendingTips; }, [pendingTips]);

  const fetchTips = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    analyticsApi
      .recent(jwt, limit, { signal: controller.signal })
      .then((r) => {
        const fresh: IndexedTip[] = r.tips.map((t) => ({ kind: "indexed" as const, ...t }));
        setIndexedTips(fresh);
        setError(null);

        // Drop optimistic entries that have now been indexed
        const confirmedAddresses = new Set(fresh.map((t) => t.fromAddress));
        setPendingTips((prev) =>
          prev.filter((p) => !confirmedAddresses.has(p.fromAddress)),
        );
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

  const startPolling = useCallback(
    (intervalMs: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        fetchTips();
        if (
          fastUntilRef.current !== null &&
          Date.now() > fastUntilRef.current
        ) {
          fastUntilRef.current = null;
          startPolling(NORMAL_INTERVAL);
        }
      }, intervalMs);
    },
    [fetchTips],
  );

  // Initial fetch + normal polling
  useEffect(() => {
    fetchTips();
    startPolling(NORMAL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTips, startPolling]);

  // On tip success: add optimistic entry + kick off fast polling
  useEffect(() => {
    const unsub = tipEvents.subscribe((payload: TipSuccessPayload) => {
      const optimistic: PendingTip = {
        kind:          "pending",
        id:            `pending-${Date.now()}`,
        fromAddress:   payload.fromAddress,
        displayAmount: payload.amount,
        message:       payload.message,
      };

      setPendingTips((prev) => [optimistic, ...prev]);

      fastUntilRef.current = Date.now() + FAST_WINDOW_MS;
      fetchTips();
      startPolling(FAST_INTERVAL);
    });
    return () => {
      unsub();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTips, startPolling]);

  // Combine for rendering
  const feed: FeedEntry[] = mergeWithPending(indexedTips, pendingTips);

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

      {!loading && !error && feed.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">
          No tips yet — share your link to get started!
        </p>
      )}

      {!loading && !error && feed.length > 0 && (
        <ul className="space-y-3" aria-label="Recent tips feed">
          {feed.map((entry) =>
            entry.kind === "pending" ? (
              <PendingTipRow key={entry.id} tip={entry} />
            ) : (
              <IndexedTipRow key={entry.id} tip={entry} />
            ),
          )}
        </ul>
      )}
    </Card>
  );
}

// ── Row sub-components ────────────────────────────────────────────────────────

function IndexedTipRow({ tip }: { tip: IndexedTip }) {
  return (
    <li className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
        <span className="text-xs">💸</span>
      </div>
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
      <span className="text-xs text-gray-600 shrink-0 mt-0.5">
        {timeAgo(tip.ledgerAt)}
      </span>
    </li>
  );
}

function PendingTipRow({ tip }: { tip: PendingTip }) {
  return (
    <li className="flex items-start gap-3 opacity-70">
      {/* Pulsing avatar to signal in-flight status */}
      <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0 animate-pulse">
        <span className="text-xs">💸</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <span className="font-mono text-gray-400">
            {shortAddress(tip.fromAddress)}
          </span>
          {" "}tipped{" "}
          <span className="font-semibold text-brand-400">
            ${tip.displayAmount} USDC
          </span>
        </p>
        {tip.message && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            "{tip.message}"
          </p>
        )}
      </div>
      {/* Confirming badge instead of a timestamp */}
      <span
        className="text-xs text-yellow-400 shrink-0 mt-0.5 flex items-center gap-1"
        aria-label="Tip is being confirmed on-chain"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />
        confirming…
      </span>
    </li>
  );
}
