"use client";

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
import { formatBps } from "@/lib/splits";
import { useWallet } from "@/contexts/WalletContext";
import { getExplorerUrl } from "@/lib/explorer";
import { CopyAddressButton } from "@/components/CopyAddressButton";

interface SplitBreakdownProps {
  splits: Array<{ to: string; bps: number }>;
}

export function SplitBreakdown({ splits }: SplitBreakdownProps) {
  const { publicKey } = useWallet();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where tips go</CardTitle>
      </CardHeader>
      <ul className="space-y-3" aria-label="Split breakdown">
        {splits.map((split, i) => {
          const isYou = publicKey !== null && split.to === publicKey;
          return (
            <SplitRow key={`${split.to}-${i}`} address={split.to} bps={split.bps} isYou={isYou} />
          );
        })}
      </ul>
    </Card>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface SplitRowProps {
  address: string;
  bps: number;
  isYou: boolean;
}

function SplitRow({ address, bps, isYou }: SplitRowProps) {
  const explorerUrl = getExplorerUrl(address);

  return (
    <li className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
        <span className="text-xs">👤</span>
      </div>
      <span className="flex-1 min-w-0 flex items-center gap-1.5">
        {explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-fg-subtle hover:text-accent transition-colors underline decoration-dotted underline-offset-2 truncate"
          >
            {shortenAddress(address)}
          </a>
        ) : (
          <span className="font-mono text-sm text-fg-subtle truncate">
            {shortenAddress(address)}
          </span>
        )}
        {isYou && <span className="text-xs font-semibold text-brand-500 shrink-0">You</span>}
        <CopyAddressButton address={address} />
      </span>
      <span className="text-sm font-semibold text-fg shrink-0">{formatBps(bps)}</span>
    </li>
  );
}
