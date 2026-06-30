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
    try { return usdcToStroops(amount); } catch { return 0n; }
  })();
  const amountValid = isValidTipAmount(stroops);
  const canSubmit   = isConnected && amountValid && step === "input";

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
          <label className="text-sm font-medium text-gray-300">
            Message{" "}
            <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={step === "signing"}
            placeholder="Say something nice… 🎉"
            maxLength={200}
            rows={2}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3
                       text-sm text-white placeholder:text-gray-600 resize-none
                       focus:outline-none focus:ring-2 focus:ring-brand-500/50
                       transition-all duration-200 disabled:opacity-50"
            aria-label="Optional tip message"
          />
          <p className="text-right text-xs text-gray-600">
            {message.length}/200
          </p>
        </div>

        {/* Error banner */}
        {step === "error" && error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
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
            <p className="text-sm text-gray-400">Connect your wallet to send a tip</p>
            <WalletConnectButton size="lg" className="w-full" />
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-600">
          Tips are final and sent directly on the Stellar network.
          No platform fees.
        </p>

      </div>
    </Card>
  );
}
