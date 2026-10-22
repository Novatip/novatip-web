"use client";

/**
 * WalletConnectButton.tsx
 *
 * Shows connect / disconnect state and triggers the Freighter SIWS flow.
 * Used in the Header and optionally on the tip page when a wallet is required.
 */

import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/Button";
import { shortenAddress } from "@novatip/sdk";

interface WalletConnectButtonProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function WalletConnectButton({ size = "md", className }: WalletConnectButtonProps) {
  const {
    publicKey, isConnected, isConnecting, isSigningIn,
    error, connect, retrySignIn, disconnect,
  } = useWallet();

  if (isConnected && publicKey) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-success text-xs font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-slow" />
            {shortenAddress(publicKey)}
          </span>
          {(error || isSigningIn) && (
            <Button
              variant="secondary"
              size="sm"
              loading={isSigningIn}
              onClick={retrySignIn}
              aria-label="Retry sign-in"
            >
              {isSigningIn ? "Signing in..." : "Retry sign-in"}
            </Button>
          )}
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
        {error && (
          <p role="alert" className="text-xs text-danger max-w-xs text-right">
            Sign-in failed: {error}
          </p>
        )}
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
        <p className="text-xs text-danger max-w-xs text-right">{error}</p>
      )}
    </div>
  );
}
