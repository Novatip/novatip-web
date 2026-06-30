"use client";

/**
 * WalletConnectButton.tsx
 *
 * Shows connect / disconnect state and triggers the Freighter SIWS flow.
 * Used in the Header and optionally on the tip page when a wallet is required.
 */

import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/Button";

/** Shorten a Stellar address for display: GABCD...WXYZ */
function shortAddress(address: string): string {
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

interface WalletConnectButtonProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function WalletConnectButton({ size = "md", className }: WalletConnectButtonProps) {
  const { publicKey, isConnected, isConnecting, error, connect, disconnect } = useWallet();

  if (isConnected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-slow" />
          {shortAddress(publicKey)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          onClick={disconnect}
          aria-label="Disconnect wallet"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        size={size}
        loading={isConnecting}
        className={className}
        onClick={connect}
        aria-label="Connect Freighter wallet"
      >
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </Button>
      {error && (
        <p className="text-xs text-red-400 max-w-xs text-right">{error}</p>
      )}
    </div>
  );
}
