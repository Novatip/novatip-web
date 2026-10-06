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

import { useEffect, useState } from "react";
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
import { getUsdcBalance } from "@/lib/balance";
import { isValidTipAmount } from "@novatip/sdk";
import { tipEvents } from "@/lib/tipEvents";
import { isLargeTip, isWithinTipCeiling } from "@/lib/tipAmount";
import { DEFAULT_TIP_AMOUNT, getLastTipAmount, storeLastTipAmount } from "@/lib/lastTipAmount";
import { MAX_MESSAGE_BYTES, utf8ByteLength } from "@/lib/tipMessage";

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

  const [amount,  setAmount]  = useState(DEFAULT_TIP_AMOUNT);
  const [message, setMessage] = useState("");
  const [step,    setStep]    = useState<FormStep>("input");
  const [error,   setError]   = useState<string | null>(null);
  const [txAmount, setTxAmount] = useState("");
  const [balance, setBalance] = useState<bigint | null>(null);

  // Read the supporter's USDC balance once connected, so an unaffordable
  // amount can be caught here instead of surfacing as an opaque wallet/chain
  // rejection after they've already signed.
  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    getUsdcBalance(publicKey)
      .then((b) => { if (!cancelled) setBalance(b); })
      .catch(() => { if (!cancelled) setBalance(null); });
    return () => { cancelled = true; };
  }, [publicKey]);

  // Restore the supporter's last tip amount after mount — not in the initial
  // useState, so the server-rendered markup (which has no access to
  // localStorage) matches the client's first paint and only then updates.
  useEffect(() => {
    setAmount(getLastTipAmount());
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const stroops    = (() => {
    try { return usdcToStroops(amount); } catch { return BigInt(0); }
  })();
  const amountValid = isValidTipAmount(stroops);
  const insufficientBalance = balance !== null && amountValid && stroops > balance;
  const trimmedMessage = message.trim();

  // The contract limits the message in UTF-8 bytes, not characters, so the
  // count shown and the count enforced both have to be in bytes — a string of
  // emoji is well under 280 characters and well over 280 bytes.
  const messageBytes = utf8ByteLength(trimmedMessage);

  // A jar with no recipients cannot pay anyone, so tipping it would fail
  // on-chain after the supporter had already signed.
  const hasRecipients = splits.length > 0;

  // The contract divides with integer maths (amount * bps / 10_000), so a
  // small enough tip rounds a collaborator's share down to nothing. Mirror
  // that division here rather than approximating it with floats.
  const zeroPaidCount = amountValid
    ? splits.filter((s) => (stroops * BigInt(s.bps)) / 10_000n === 0n).length
    : 0;

  const canSubmit   =
    isConnected &&
    amountValid &&
    hasRecipients &&
    !insufficientBalance &&
    messageBytes <= MAX_MESSAGE_BYTES &&
    step === "input";

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleTip() {
    if (!publicKey || !amountValid || !hasRecipients) return;

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
      storeLastTipAmount(amount);

      // Notify RecentTips and Leaderboard so they can refresh immediately
      tipEvents.emit({
        fromAddress: publicKey,
        amount,
        message: message.trim(),
        slug,
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
          setAmount(getLastTipAmount());
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
          disabled={step === "signing"}
          balance={balance}
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
            disabled={step === "signing" || step === "confirm" || !hasRecipients}
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

        {/* Unconfigured jar warning */}
        {!hasRecipients && (
          <div className="rounded-xl bg-warning/10 border border-warning/20 px-4 py-3">
            <p className="text-sm text-warning">
              This jar has no recipients configured and cannot receive tips.
            </p>
          </div>
        )}

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
              aria-label={
                !hasRecipients
                  ? "Jar not configured"
                  : step === "signing"
                  ? "Sending tip…"
                  : `Send $${amount} USDC tip`
              }
            >
              {!hasRecipients
                ? "Jar not configured"
                : step === "signing"
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
