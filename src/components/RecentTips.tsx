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
 *   - Paused while the tab is hidden (any in-flight request is aborted) and
 *     refreshed immediately on return — see hooks/usePolling.
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
import { usePolling } from "@/hooks/usePolling";
import { useAbortableRequest } from "@/hooks/useAbortableRequest";
import { formatUsdc, shortenAddress } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { timeAgo } from "@/lib/time";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IndexedTip {
  kind: "indexed";
  id: string;
  fromAddress: string;
  amount: string; // raw stroops string from API
  message: string;
  ledgerAt: string;
}

export interface PendingTip {
  kind: "pending";
  /** Unique client-side id — never collides with real indexed ids. */
  id: string;
  fromAddress: string;
  /** Dollar amount string from TipForm, e.g. "2" */
  displayAmount: string;
  message: string;
  /**
   * Unix timestamp (ms) after which this entry is considered unconfirmed.
   * Set to Date.now() + FAST_WINDOW_MS when the optimistic entry is created.
   */
  expiresAt: number;
}

export interface UnconfirmedTip extends Omit<PendingTip, "kind"> {
  kind: "unconfirmed";
}

export type FeedEntry = IndexedTip | PendingTip | UnconfirmedTip;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a dollar display string (e.g. "5" or "2.50") to raw stroops
 * (1 USDC = 10_000_000 stroops) using integer arithmetic to avoid
 * floating-point drift.
 */
function displayAmountToStroops(display: string): bigint {
  const [integer = "0", fraction = ""] = display.split(".");
  const paddedFraction = fraction.padEnd(7, "0").slice(0, 7);
  return BigInt(integer) * 10_000_000n + BigInt(paddedFraction);
}

/**
 * Return true when an indexed tip is the on-chain counterpart of a pending
 * optimistic entry — same sender AND the raw amount corresponds to the dollar
 * value the user submitted (≥ to survive rounding and split scenarios).
 */
export function isMatch(indexed: IndexedTip, pending: PendingTip): boolean {
  if (indexed.fromAddress !== pending.fromAddress) return false;
  try {
    return BigInt(indexed.amount) >= displayAmountToStroops(pending.displayAmount);
  } catch {
    return false;
  }
}

/**
 * Merge a fresh list of indexed tips with any still-pending optimistic entries.
 *
 * An optimistic entry is considered "confirmed" (and therefore removed) when
 * the indexed list contains a tip from the same sender where the raw amount
 * corresponds to the same dollar value the user submitted.  We use a loose
 * match (same address, amount ≥ optimistic) to survive rounding and split
 * scenarios, but we always require both fields so a returning supporter's
 * earlier tip never clears their new pending entry.
 *
 * If the fast-polling window has elapsed without a match, the entry is
 * downgraded to "unconfirmed" so the UI can signal that something may have
 * gone wrong — rather than leaving a pulsing "confirming…" row indefinitely.
 */
export function mergeWithPending(
  indexed: IndexedTip[],
  pending: PendingTip[],
  now = Date.now(),
): FeedEntry[] {
  const unconfirmed: UnconfirmedTip[] = [];
  const stillPending: PendingTip[] = [];

  for (const p of pending) {
    // confirmed — an indexed tip matches both address AND amount
    if (indexed.some((t) => isMatch(t, p))) continue;
    if (now > p.expiresAt) {
      // Window elapsed without a match — downgrade to unconfirmed
      unconfirmed.push({ ...p, kind: "unconfirmed" });
    } else {
      stillPending.push(p);
    }
  }

  // Pending (still-confirming) entries go at the top, followed by unconfirmed,
  // then the indexed list.
  return [...stillPending, ...unconfirmed, ...indexed];
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Steady-state poll interval — frequent enough to feel live without hammering the backend. */
export const NORMAL_INTERVAL = 15_000;

/** Poll interval while a tip is awaiting confirmation, so it shows up promptly once indexed. */
export const FAST_INTERVAL = 3_000;

/** How long to keep polling at FAST_INTERVAL after a tip, matching typical ledger-indexing latency. */
export const FAST_WINDOW_MS = 30_000;

// ── Component ─────────────────────────────────────────────────────────────────

interface RecentTipsProps {
  jwt: string;
  limit?: number;
}

export function RecentTips({ jwt, limit = 20 }: RecentTipsProps) {
  const { data: indexedTips, loading, error, run, abort: abortInFlight } =
    useAbortableRequest<IndexedTip[]>([]);
  const [pendingTips, setPendingTips] = useState<PendingTip[]>([]);
  const [intervalMs, setIntervalMs] = useState(NORMAL_INTERVAL);

  const fastUntilRef = useRef<number | null>(null);

  // Tracks ids from the previous successful fetch so new arrivals can be
  // announced. Stays null until the first fetch resolves, which is how we
  // avoid announcing the initial page load as "new" tips.
  const previousIndexedIdsRef = useRef<Set<string> | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Keep a ref to pendingTips so the fetch callback can read the latest value
  // without being re-created every time pendingTips changes.
  const pendingRef = useRef<PendingTip[]>([]);
  useEffect(() => { pendingRef.current = pendingTips; }, [pendingTips]);

  const fetchTips = useCallback(() => {
    run((signal) =>
      analyticsApi.recent(jwt, limit, { signal }).then((r) => {
        const fresh: IndexedTip[] = r.tips.map((t) => ({ kind: "indexed" as const, ...t }));

        // Drop optimistic entries whose indexed counterpart has arrived,
        // matched by both address AND amount — not just address alone.
        setPendingTips((prev) =>
          prev.filter((p) => !fresh.some((t) => isMatch(t, p))),
        );

        // Announce newly-arrived tips, skipping the very first fetch so the
        // initial page load isn't read out as an "arrival".
        if (previousIndexedIdsRef.current !== null) {
          const newCount = fresh.filter(
            (t) => !previousIndexedIdsRef.current!.has(t.id),
          ).length;
          if (newCount > 0) {
            setAnnouncement(
              `${newCount} new tip${newCount !== 1 ? "s" : ""} received`,
            );
          }
        }
        previousIndexedIdsRef.current = new Set(fresh.map((t) => t.id));

        return fresh;
      }),
    );
  }, [jwt, limit, run]);

  const poll = useCallback(() => {
    fetchTips();
    // Prune entries that have outlived their confirmation window from state so
    // the mergeWithPending render path doesn't keep downgrading them on every
    // paint — they've already moved to "unconfirmed" in the UI.
    setPendingTips((prev) => prev.filter((p) => Date.now() <= p.expiresAt));
    if (fastUntilRef.current !== null && Date.now() > fastUntilRef.current) {
      fastUntilRef.current = null;
      setIntervalMs(NORMAL_INTERVAL);
    }
  }, [fetchTips]);

  // Initial fetch + polling, paused while the tab is hidden.
  // useAbortableRequest aborts any in-flight request on unmount itself.
  usePolling(poll, intervalMs, { onHidden: abortInFlight });

  // On tip success: add optimistic entry + kick off fast polling
  useEffect(() => {
    const unsub = tipEvents.subscribe((payload: TipSuccessPayload) => {
      const expiresAt = Date.now() + FAST_WINDOW_MS;
      const optimistic: PendingTip = {
        kind: "pending",
        id: `pending-${Date.now()}`,
        fromAddress: payload.fromAddress,
        displayAmount: payload.amount,
        message: payload.message,
        expiresAt,
      };

      setPendingTips((prev) => [optimistic, ...prev]);

      fastUntilRef.current = expiresAt;
      fetchTips();
      setIntervalMs(FAST_INTERVAL);
    });
    return unsub;
  }, [fetchTips]);

  // Combine for rendering
  const feed: FeedEntry[] = mergeWithPending(indexedTips, pendingTips);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle level={2}>Recent Tips</CardTitle>
          <span className="flex items-center gap-1.5 text-xs text-fg-faint">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-slow"
            />
            Live
          </span>
        </div>
      </CardHeader>

      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-hairline shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 rounded bg-hairline" />
                <div className="h-3 w-48 rounded bg-hairline/50" />
              </div>
              <div className="h-4 w-12 rounded bg-hairline" />
            </div>
          ))}
        </div>
      )}

      {/* Non-blocking error notice — shown above the list so stale data remains visible */}
      {error && (
        <p className="text-sm text-danger mb-3" role="alert">{error}</p>
      )}

      {!loading && feed.length === 0 && (
        <p className="text-sm text-fg-faint py-4 text-center">
          No tips yet — share your link to get started!
        </p>
      )}

      {!loading && feed.length > 0 && (
        <ul className="space-y-3" aria-label="Recent tips feed">
          {feed.map((entry) =>
            entry.kind === "pending" ? (
              <PendingTipRow key={entry.id} tip={entry} />
            ) : entry.kind === "unconfirmed" ? (
              <UnconfirmedTipRow key={entry.id} tip={entry} />
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
        <p className="text-sm text-fg">
          <span className="font-mono text-fg-subtle">
            {shortenAddress(tip.fromAddress)}
          </span>
          {" "}tipped{" "}
          <span className="font-semibold text-accent">
            ${formatUsdc(BigInt(tip.amount), 2)} USDC
          </span>
        </p>
        {tip.message && (
          <p className="text-xs text-fg-faint mt-0.5 truncate">
            &ldquo;{tip.message}&rdquo;
          </p>
        )}
      </div>
      <TimeAgo iso={tip.ledgerAt} className="text-xs text-fg-dim shrink-0 mt-0.5">
        {timeAgo(tip.ledgerAt)}
      </TimeAgo>
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
        <p className="text-sm text-fg">
          <span className="font-mono text-fg-subtle">
            {shortenAddress(tip.fromAddress)}
          </span>
          {" "}tipped{" "}
          <span className="font-semibold text-accent">
            ${tip.displayAmount} USDC
          </span>
        </p>
        {tip.message && (
          <p className="text-xs text-fg-faint mt-0.5 truncate">
            &ldquo;{tip.message}&rdquo;
          </p>
        )}
      </div>
      {/* Confirming badge instead of a timestamp */}
      <span
        className="text-xs text-warning shrink-0 mt-0.5 flex items-center gap-1"
        aria-label="Tip is being confirmed on-chain"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse shrink-0" />
        confirming…
      </span>
    </li>
  );
}

/**
 * Shown when the fast-polling window has elapsed without an indexed match.
 * Signals to the creator that the tip may not have landed rather than
 * showing a forever-pulsing "confirming…" row.
 */
function UnconfirmedTipRow({ tip }: { tip: UnconfirmedTip }) {
  return (
    <li className="flex items-start gap-3 opacity-50">
      <div className="h-8 w-8 rounded-full bg-fg-faint/20 flex items-center justify-center shrink-0">
        <span className="text-xs">💸</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-fg">
          <span className="font-mono text-fg-subtle">
            {shortenAddress(tip.fromAddress)}
          </span>
          {" "}tipped{" "}
          <span className="font-semibold text-accent">
            ${tip.displayAmount} USDC
          </span>
        </p>
        {tip.message && (
          <p className="text-xs text-fg-faint mt-0.5 truncate">
            &ldquo;{tip.message}&rdquo;
          </p>
        )}
      </div>
      {/* Unconfirmed badge — no pulse, dimmer colour */}
      <span
        className="text-xs text-fg-faint shrink-0 mt-0.5 flex items-center gap-1"
        aria-label="Tip could not be confirmed on-chain"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-fg-faint shrink-0" />
        unconfirmed
      </span>
    </li>
  );
}
