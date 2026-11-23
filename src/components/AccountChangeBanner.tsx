"use client";

/**
 * AccountChangeBanner.tsx
 *
 * Shown above every page while Freighter's active account differs from the one
 * this session was connected with. The header chip and the dashboard keep
 * showing the old account until the user reconnects, so the banner says so
 * rather than letting the mismatch surface as a failed signature.
 *
 * Reconnecting ends the old session first, so the old account's data is not
 * left on screen if signing in as the new one fails or is declined.
 */

import { useWallet } from "@/contexts/WalletContext";
import { useActiveAccountChange } from "@/hooks/useActiveAccountChange";
import { Button } from "@/components/ui/Button";
import { shortenAddress } from "@novatip/sdk";

function Notice({ publicKey }: { publicKey: string }) {
  const { connect, disconnect, isConnecting } = useWallet();
  const active = useActiveAccountChange(publicKey);

  if (!active) return null;

  function reconnect() {
    disconnect();
    void connect();
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 border-b border-warning/20 bg-warning/10 px-4 py-2 text-center text-sm text-warning sm:flex-row sm:gap-4"
    >
      <p>
        Freighter is now on{" "}
        <span className="font-mono">{shortenAddress(active)}</span>, but you are
        connected as{" "}
        <span className="font-mono">{shortenAddress(publicKey)}</span>.
      </p>
      <Button
        variant="secondary"
        size="sm"
        loading={isConnecting}
        onClick={reconnect}
        aria-label="Reconnect with the active Freighter account"
      >
        Reconnect
      </Button>
    </div>
  );
}

export function AccountChangeBanner() {
  const { publicKey } = useWallet();

  // Only mounted while connected, so nothing polls the extension otherwise.
  return publicKey ? <Notice publicKey={publicKey} /> : null;
}
