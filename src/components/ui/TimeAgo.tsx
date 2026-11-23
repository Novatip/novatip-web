/**
 * components/ui/TimeAgo.tsx
 *
 * Wraps an already-formatted relative time label ("3h ago") in a <time>
 * element carrying the machine-readable ISO timestamp, with a title showing
 * the absolute local time on hover — reconciling a tip against a wallet or a
 * block explorer needs the actual time, not just how long ago it happened.
 */

import { formatAbsoluteTime } from "@/lib/time";

interface TimeAgoProps {
  /** ISO 8601 timestamp this label is relative to. */
  iso: string;
  /** The already-formatted relative label, e.g. "3h ago". */
  children: string;
  className?: string;
}

export function TimeAgo({ iso, children, className }: TimeAgoProps) {
  return (
    <time dateTime={iso} title={formatAbsoluteTime(iso)} className={className}>
      {children}
    </time>
  );
}
