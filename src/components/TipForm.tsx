"use client";

/**
 * TipForm.tsx
 *
 * Core tip submission flow:
 *   1. Wallet not connected → show connect prompt
 *   2. Connected → show AmountPicker + message input + Tip button
 *   3. Signing → loading state
 *   4. Success → hand off to TipSuccess
 *   5. Error → inline error message with retry
 */

import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { AmountPicker } from "@/components/AmountPicker";
import { TipSuccess } from "@/components/TipSuccess";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  assertActiveAccount,
  getTipSplitterClient,
  makeSignTransaction,
  usdcToStroops,
} from "@/lib/wallet";
import { isValidTipAmount } from "@novatip/sdk";
import { tipEvents } from "@/lib/tipEvents";
import { isLargeTip, isWithinTipCeiling } from "@/lib/tipAmount";

// FRONTEND MESSAGE BYTE LIMIT
// The contract counts UTF-8 bytes, not JavaScript UTF-16 code units.
// Clients must use the same unit to avoid accepting messages the contract rejects.
// TODO: Once the contract-side limit is exported by the SDK, import from @novatip/sdk.
export const MAX_MESSAGE_BYTES = 280;

/** Count how many UTF-8 bytes a string occupies. */
function utf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).byteLength;
}

export interface Split {
  to:  string;
  bps: number;
}

interface TipFormProps {
  jarId:   string;
  slug:    string;
  /** Collaborator splits for this jar, used to warn when the tip is too small. */
  splits?: Split[];
}

type FormStep = "input" | "confirm" | "signing" | "success" | "error";

export function TipForm({ jarId, slug, splits = [] }: TipFormProps) {
  const { publicKey, isConnected } = useWallet();

  const [amount,  setAmount]  = useState("2");
  const [message, setMessage] = useState("");
  const [step,    setStep]    = useState<FormStep>("input");
  const [error,   setError]   = useState<string | null>(null);
  const [txAmount, setTxAmount] = useState("");

  // ── Validation ─────────────────────────────────────────────────────────────
  const stroops    = (() => {
    try { return usdcToStroops(amount); } catch { return BigInt(0); }
  })();
  const amountValid = isValidTipAmount(stroops) && isWithinTipCeiling(amount);
  const trimmedMessage = message.trim();
  const messageBytes   = utf8ByteLength(trimmedMessage);
  const canSubmit   = isConnected && amountValid && messageBytes <= MAX_MESSAGE_BYTES && step === "input";

  // ── Splits-too-small warning ────────────────────────────────────────────────
  // The contract computes each non-final collaborator's share as
  //   floor(amount_stroops * bps / 10_000)
  // and silently skips any share that rounds down to zero. Warn when at least
  // one collaborator would receive nothing so the supporter can raise the amount.
  const zeroPaidCount = splits.length > 1 && stroops > 0n
    ? splits.slice(0, -1).filter(
        (s) => (stroops * BigInt(s.bps)) / 10_000n === 0n,
      ).length
    : 0;

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleTip() {
    if (!publicKey || !amountValid) return;

    setStep("signing");
    setError(null);

    try {
      const client = getTipSplitterClient();
      await client.tip(
        {
          from:    publicKey,
          jarId,
          amount:  stroops,
          message: message.trim(),
        },
        { signTransaction: makeSignTransaction(publicKey) },
      );

      setTxAmount(amount);
      setStep("success");

      // Notify RecentTips and Leaderboard so they can refresh immediately
      tipEvents.emit({
        fromAddress: publicKey,
        amount,
        message: message.trim(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed. Please try again.";
      setError(msg);
      setStep("error");
    }
  }

  function handleRetry() {
    setStep("input");
    setError(null);
  }

  // Presets top out at $25, so this only ever gates the custom field — the
  // one path a typo (5 → 500) can slip through before the wallet opens.
  function handleCtaClick() {
    if (isLargeTip(amount)) {
      setStep("confirm");
    } else {
      void handleTip();
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <TipSuccess
        amount={txAmount}
        slug={slug}
        onReset={() => {
          setStep("input");
          setAmount("2");
          setMessage("");
        }}
      />
    );
  }

  // ── Input / signing / error state ──────────────────────────────────────────
  return (
    <Card>
      <div className="flex flex-col gap-5">

        {/* Amount picker */}
        <AmountPicker
          value={amount}
          onChange={setAmount}
          disabled={step === "signing" || step === "confirm"}
        />

        {/* Message input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-fg-muted">
            Message{" "}
            <span className="text-fg-dim font-normal">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={step === "signing" || step === "confirm"}
            placeholder="Say something nice… 🎉"
            rows={2}
            className="w-full rounded-xl bg-surface-strong border border-hairline px-4 py-3
                       text-sm text-fg placeholder:text-fg-dim resize-none
                       focus:outline-none focus:ring-2 focus:ring-brand-500/50
                       transition-all duration-200 disabled:opacity-50"
            aria-label="Optional tip message"
          />
          <p className={`text-right text-xs ${messageBytes > MAX_MESSAGE_BYTES ? "text-danger" : "text-fg-dim"}`}>
            {messageBytes}/{MAX_MESSAGE_BYTES} bytes
          </p>
        </div>

        {/* Splits-too-small warning */}
        {zeroPaidCount > 0 && (
          <div className="rounded-xl bg-warning/10 border border-warning/20 px-4 py-3">
            <p className="text-sm text-warning">
              At this amount,{" "}
              <span className="font-semibold">
                {zeroPaidCount} of {splits.length} collaborator{zeroPaidCount !== 1 ? "s" : ""}
              </span>{" "}
              would receive nothing — their share rounds to zero. Increase the tip amount so everyone is paid.
            </p>
          </div>
        )}

        {/* Error banner */}
        {step === "error" && error && (
          <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* CTA */}
        {isConnected ? (
          step === "confirm" ? (
            <div className="rounded-xl bg-warning/10 border border-warning/20 px-4 py-3 flex flex-col gap-3">
              <p className="text-sm text-fg">
                That&rsquo;s <span className="font-semibold text-accent">${amount} USDC</span> —
                unusually large for a tip. Once signed, it can&rsquo;t be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  className="flex-1"
                  onClick={() => setStep("input")}
                >
                  Cancel
                </Button>
                <Button
                  size="md"
                  className="flex-1"
                  onClick={() => void handleTip()}
                  aria-label={`Confirm sending $${amount} USDC tip`}
                >
                  Confirm ${amount} tip
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={!canSubmit}
              loading={step === "signing"}
              onClick={step === "error" ? handleRetry : handleCtaClick}
              aria-label={step === "signing" ? "Sending tip…" : `Send $${amount} USDC tip`}
            >
              {step === "signing"
                ? "Waiting for signature…"
                : step === "error"
                ? "Retry"
                : `Send $${amountValid ? amount : "—"} USDC tip 💸`}
            </Button>
          )
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <p className="text-sm text-fg-subtle">Connect your wallet to send a tip</p>
            <WalletConnectButton size="lg" className="w-full" />
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center text-xs text-fg-faint">
          Tips are final and sent directly on the Stellar network.
          No platform fees.
        </p>

      </div>
    </Card>
  );
}
