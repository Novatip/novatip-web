"use client";

/**
 * CollaboratorEarnings.tsx
 *
 * Displays earnings breakdown for each collaborator in a split.
 * Fetches on mount from the /analytics/collaborators endpoint.
 */

import { useCallback, useEffect } from "react";
import { analyticsApi } from "@/lib/api";
import { useAbortableRequest } from "@/hooks/useAbortableRequest";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { formatUsdc, shortenAddress } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface Collaborator {
  address: string;
  totalAmountRaw: string;
}

interface CollaboratorEarningsProps {
  jwt: string;
}

export function CollaboratorEarnings({ jwt }: CollaboratorEarningsProps) {
  const { data: collaborators, loading, error, run } = useAbortableRequest<Collaborator[]>([]);

  const fetchCollaborators = useCallback(() => {
    run((signal) =>
      analyticsApi.collaborators(jwt, { signal }).then((r) => r.collaborators),
    );
  }, [jwt, run]);

  // Initial fetch
  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  return (
    <Card>
      <CardHeader>
        <CardTitle level={2}>Collaborator Earnings</CardTitle>
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

      {!loading && collaborators.length === 0 && (
        <p className="text-sm text-fg-faint py-4 text-center">
          No collaborators yet — add splits to share tips with others!
        </p>
      )}

      {!loading && collaborators.length > 0 && (
        <ul className="space-y-2" aria-label="Collaborator earnings">
          {collaborators.map((c) => (
            <CollaboratorRow key={c.address} collaborator={c} />
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function CollaboratorRow({ collaborator }: { collaborator: Collaborator }) {
  const { copied, failed, copy } = useCopyToClipboard();

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
        "hover:bg-surface-strong",
      )}
    >
      {/* Address + copy control */}
      <span className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="font-mono text-sm text-fg-muted truncate">
          {shortenAddress(collaborator.address)}
        </span>
        <button
          type="button"
          onClick={() => void copy(collaborator.address)}
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
                : `Copy full address ${collaborator.address}`
          }
        >
          {copied ? "✓" : failed ? "✕" : "📋"}
        </button>
      </span>

      {/* Amount */}
      <span className="text-sm font-semibold text-accent shrink-0">
        {(() => {
          try {
            const amount = BigInt(collaborator.totalAmountRaw);
            return `$${formatUsdc(amount, 2)}`;
          } catch {
            return "—";
          }
        })()}
      </span>
    </li>
  );
}
