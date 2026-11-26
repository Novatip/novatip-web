/**
 * PublicSupportersFeed.tsx
 *
 * Social proof on the public tip page: a short list of a creator's most
 * recent tips. Unlike the dashboard's RecentTips, this needs no JWT — the
 * data rides along in the public /resolve/:slug response and is rendered
 * once server-side, with no polling or optimistic entries.
 */

import type { PublicTip } from "@/lib/api";
import { shortenAddress } from "@novatip/sdk";
import { parseRawAmount, formatRawUsdc } from "@/lib/rawAmount";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { timeAgo } from "@/lib/time";

interface PublicSupportersFeedProps {
  tips: PublicTip[];
}

export function PublicSupportersFeed({ tips }: PublicSupportersFeedProps) {
  // Rows whose amount cannot be parsed are dropped up front, so "nothing to
  // show" means the same thing whether the list came back empty or every row
  // in it was unusable.
  const rows = tips.flatMap((tip) => {
    const amount = parseRawAmount(tip.amount);
    return amount === null ? [] : [{ tip, amount }];
  });

  // A new creator's page would otherwise end after the QR code with no hint
  // that supporters will ever appear. A full "Recent Supporters" card with no
  // rows reads as a bug, so show a short invitation instead of that heading.
  if (rows.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm font-medium text-fg">Be the first to tip</p>
        <p className="text-xs text-fg-faint mt-1">Supporters will show up here.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle level={2}>Recent Supporters</CardTitle>
      </CardHeader>

      <ul className="space-y-3" aria-label="Recent supporters">
        {rows.map(({ tip, amount }) => (
          <li key={tip.id} className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs">💸</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-fg">
                <span className="font-mono text-fg-subtle">{shortenAddress(tip.fromAddress)}</span>{" "}
                tipped{" "}
                <span className="font-semibold text-accent">${formatRawUsdc(tip.amount, 2)} USDC</span>
              </p>
              {tip.message && (
                <p className="text-xs text-fg-faint mt-0.5 truncate">&ldquo;{tip.message}&rdquo;</p>
              )}
            </div>
            <TimeAgo iso={tip.ledgerAt} className="text-xs text-fg-dim shrink-0 mt-0.5">
              {timeAgo(tip.ledgerAt)}
            </TimeAgo>
          </li>
        ))}
      </ul>
    </Card>
  );
}
