/**
 * lib/time.ts
 *
 * Shared "time ago" formatter for tip timestamps. Used by every screen that
 * shows a ledger timestamp (dashboard recent tips, tip history, public
 * supporters feed) so they all agree on how old a tip reads instead of each
 * keeping its own divergent copy.
 */

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  // Clamp to 0 so a client clock slightly behind the ledger reads "just now"
  // rather than producing a negative value like "-4s ago".
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  // Beyond a day, an ever-growing "47d ago" is less useful than the actual
  // date — switch to a calendar date the same way the history page always has.
  return new Date(then).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats an ISO timestamp into an absolute, human-readable local time.
 *
 * Used as the hover title on a relative label like "3h ago" — reconciling a
 * tip against a wallet or a block explorer needs the actual time, which the
 * relative label alone can never give. See components/ui/TimeAgo.tsx.
 */
export function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}
