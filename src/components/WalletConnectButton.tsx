"use client";

/**
 * WalletConnectButton.tsx
 *
 * Shows connect / disconnect state and triggers the Freighter SIWS flow.
 * Used in the Header and optionally on the tip page when a wallet is required.
 */

import { useWallet, type WalletErrorCode } from "@/contexts/WalletContext";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { shortenAddress } from "@novatip/sdk";

interface WalletConnectButtonProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

// The connected-account chip in the header. A creator setting up splits or
// pointing a collaborator at their account has no other way to get the full
// address out of the shortened display, so the chip itself copies it.
function AddressChip({ publicKey }: { publicKey: string }) {
  const { copied, failed, copy } = useCopyToClipboard();

  return (
    <button
      type="button"
      onClick={() => void copy(publicKey)}
      className={cn(
        "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/50",
        failed
          ? "bg-danger/10 border-danger/20 text-danger"
          : "bg-success/10 border-success/20 text-success hover:bg-success/15",
      )}
      aria-label={
        copied
          ? "Full address copied"
          : failed
            ? "Couldn't copy address — try again"
            : `Copy full wallet address ${publicKey}`
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-slow shrink-0" aria-hidden="true" />
      {copied ? "Copied!" : failed ? "Copy failed" : shortenAddress(publicKey)}
    </button>
  );
}

// The not-installed error reads "Freighter wallet extension not found.
// Install it from freighter.app, then reload this page." — this splits that
// sentence around the bare domain so it can render as a real link instead of
// unclickable text a first-time visitor has to retype.
const FREIGHTER_NOT_INSTALLED_PREFIX = "Freighter wallet extension not found. Install it from ";
const FREIGHTER_NOT_INSTALLED_SUFFIX = ", then reload this page.";

function ConnectionError({ error, errorCode }: { error: string; errorCode: WalletErrorCode | null }) {
  if (errorCode === "FREIGHTER_NOT_INSTALLED") {
    return (
      <p className="text-xs text-danger max-w-xs text-right">
        {FREIGHTER_NOT_INSTALLED_PREFIX}
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-danger/80"
        >
          freighter.app
        </a>
        {FREIGHTER_NOT_INSTALLED_SUFFIX}
      </p>
    );
  }

  return <p className="text-xs text-danger max-w-xs text-right">{error}</p>;
}

export function WalletConnectButton({ size = "md", className }: WalletConnectButtonProps) {
  const {
    publicKey, isConnected, isConnecting, isSigningIn,
    error, errorCode, connect, retrySignIn, disconnect,
  } = useWallet();

  if (isConnected && publicKey) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <AddressChip publicKey={publicKey} />
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
            <svg className="h-4 w-4 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 5H5v14h4M14 8l4 4-4 4M9 12h9" />
            </svg>
            <span className="hidden sm:inline">Disconnect</span>
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
      >
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </Button>
      {error && <ConnectionError error={error} errorCode={errorCode} />}
    </div>
  );
}
