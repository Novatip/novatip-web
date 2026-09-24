/**
 * PublicSupportersFeed.tsx
 *
 * Social proof on the public tip page: a short list of a creator's most
 * recent tips. Unlike the dashboard's RecentTips, this needs no JWT — the
 * data rides along in the public /resolve/:slug response and is rendered
 * once server-side, with no polling or optimistic entries.
 */

import type { PublicTip } from "@/lib/api";
import { formatUsdc, shortenAddress } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface PublicSupportersFeedProps {
  tips: PublicTip[];
}

export function PublicSupportersFeed({ tips }: PublicSupportersFeedProps) {
  // Nothing to show a visitor yet — an empty "Recent Supporters" card reads
  // as a bug, not as proof, so skip the section entirely rather than showing
  // it empty.
  if (tips.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Supporters</CardTitle>
      </CardHeader>

      <ul className="space-y-3" aria-label="Recent supporters">
        {tips.map((tip) => (
          <li key={tip.id} className="flex items-start gap-3">
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
            <span className="text-xs text-fg-dim shrink-0 mt-0.5">
              {timeAgo(tip.ledgerAt)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
