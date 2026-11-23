"use client";

/**
 * hooks/useActiveAccountChange.ts
 *
 * Notices when the account selected in Freighter is no longer the one the app
 * connected with.
 *
 * The connected address is stored once, at connect time, and Freighter is only
 * asked about its active account when a write is about to be signed
 * (assertActiveAccount). Someone who switches accounts in the extension in
 * between would otherwise keep seeing the old address and the old account's
 * data. This polls the extension instead of relying on its change watcher so
 * it can ride usePolling, which stops while the tab is hidden and checks again
 * the moment it is visible.
 *
 * Returns the active address when it differs from `connected`, otherwise null.
 * An extension that will not say (locked, closed) is not a change, matching
 * assertActiveAccount.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { getActiveAddress } from "@/lib/wallet";

/** How often to ask Freighter which account is active while the tab is visible. */
export const ACTIVE_ACCOUNT_POLL_MS = 3_000;

export function useActiveAccountChange(connected: string | null): string | null {
  const [active, setActive] = useState<string | null>(null);

  // Replies can arrive out of order or after unmount; only the newest counts.
  const latest = useRef(0);
  useEffect(() => () => { latest.current += 1; }, []);

  const check = useCallback(() => {
    if (!connected) return;
    const id = ++latest.current;
    getActiveAddress()
      .catch(() => null)
      .then((address) => {
        if (id === latest.current) setActive(address);
      });
  }, [connected]);

  usePolling(check, ACTIVE_ACCOUNT_POLL_MS);

  return connected && active && active !== connected ? active : null;
}
