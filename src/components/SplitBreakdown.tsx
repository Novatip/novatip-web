/**
 * SplitBreakdown.tsx
 *
 * Read-only list of who a tip jar's splits pay out to and in what share.
 * Splits are already public on chain and returned by the resolver — this is
 * just the first place the app shows them, so a supporter can see exactly
 * where their money goes before signing.
 */

import { shortenAddress } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface SplitBreakdownProps {
  splits: Array<{ to: string; bps: number }>;
}

export function SplitBreakdown({ splits }: SplitBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Where tips go</CardTitle>
      </CardHeader>
      <ul className="space-y-3" aria-label="Split breakdown">
        {splits.map((split, i) => (
          <li key={`${split.to}-${i}`} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs">👤</span>
            </div>
            <span className="flex-1 min-w-0 font-mono text-sm text-fg-subtle truncate">
              {shortenAddress(split.to)}
            </span>
            <span className="text-sm font-semibold text-fg shrink-0">
              {(split.bps / 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
