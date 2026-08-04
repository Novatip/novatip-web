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
import { getTipSplitterClient, makeSignTransaction, usdcToStroops } from "@/lib/wallet";
import { isValidTipAmount } from "@novatip/sdk";
import { tipEvents } from "@/lib/tipEvents";

// FRONTEND MESSAGE LENGTH LIMIT
// TODO: Once the contract-side limit lands and is exported by the SDK,
// import this value from @novatip/sdk instead of hardcoding here.
export const MAX_MESSAGE_LENGTH = 200;

interface TipFormProps {
  jarId: string;
  slug:  string;
}

type FormStep = "input" | "signing" | "success" | "error";

export function TipForm({ jarId, slug }: TipFormProps) {
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
  const amountValid = isValidTipAmount(stroops);
  const trimmedMessage = message.trim();
  const canSubmit   = isConnected && amountValid && trimmedMessage.length <= MAX_MESSAGE_LENGTH && step === "input";

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
        { signTransaction: makeSignTransaction() },
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
          disabled={step === "signing"}
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
            disabled={step === "signing"}
            placeholder="Say something nice… 🎉"
            maxLength={MAX_MESSAGE_LENGTH}
            rows={2}
            className="w-full rounded-xl bg-surface-strong border border-hairline px-4 py-3
                       text-sm text-fg placeholder:text-fg-dim resize-none
                       focus:outline-none focus:ring-2 focus:ring-brand-500/50
                       transition-all duration-200 disabled:opacity-50"
            aria-label="Optional tip message"
          />
          <p className="text-right text-xs text-fg-dim">
            {trimmedMessage.length}/{MAX_MESSAGE_LENGTH}
          </p>
        </div>

        {/* Error banner */}
        {step === "error" && error && (
          <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* CTA */}
        {isConnected ? (
          <Button
            size="lg"
            className="w-full"
            disabled={!canSubmit}
            loading={step === "signing"}
            onClick={step === "error" ? handleRetry : handleTip}
            aria-label={step === "signing" ? "Sending tip…" : `Send $${amount} USDC tip`}
          >
            {step === "signing"
              ? "Waiting for signature…"
              : step === "error"
              ? "Retry"
              : `Send $${amountValid ? amount : "—"} USDC tip 💸`}
          </Button>
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
