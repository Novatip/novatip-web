"use client";

/**
 * app/onboarding/page.tsx
 *
 * 3-step onboarding wizard:
 *   Step 0 — Connect wallet (if not connected)
 *   Step 1 — Claim slug
 *   Step 2 — Configure splits
 *   Step 3 — Share link + QR
 */

import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { SlugStep }      from "@/components/onboarding/SlugStep";
import { SplitsStep }    from "@/components/onboarding/SplitsStep";
import { ShareStep }     from "@/components/onboarding/ShareStep";
import { Card }          from "@/components/ui/Card";
import Link from "next/link";

const STEP_LABELS = ["Claim slug", "Set splits", "Share"];

export default function OnboardingPage() {
  const { isConnected, jwt } = useWallet();
  const [step, setStep] = useState(0);
  const [slug, setSlug] = useState("");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Back link */}
      <div className="w-full max-w-md mb-6">
        <Link href="/" className="text-sm text-fg-faint hover:text-fg-muted transition-colors">
          ← Back
        </Link>
      </div>

      <div className="w-full max-w-md flex flex-col gap-6 animate-slide-up">

        {/* Header */}
        <div className="text-center">
          <span className="text-4xl mb-3 block" role="img" aria-label="tip jar">💸</span>
          <h1 className="text-2xl font-bold text-fg">Create your tip jar</h1>
          <p className="text-sm text-fg-subtle mt-1">Takes less than a minute</p>
        </div>

        {/* Wallet gate */}
        {!isConnected ? (
          <Card>
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-sm text-fg-subtle text-center">
                Connect your Stellar wallet to get started
              </p>
              <WalletConnectButton size="lg" className="w-full" />
            </div>
          </Card>
        ) : (
          <>
            {/* Step indicator */}
            <StepIndicator
              currentStep={step}
              totalSteps={STEP_LABELS.length}
              labels={STEP_LABELS}
            />

            {/* Step content */}
            <Card>
              {step === 0 && jwt && (
                <SlugStep
                  jwt={jwt}
                  onNext={(s) => { setSlug(s); setStep(1); }}
                />
              )}
              {step === 1 && (
                <SplitsStep
                  slug={slug}
                  onNext={() => setStep(2)}
                />
              )}
              {step === 2 && (
                <ShareStep slug={slug} />
              )}
            </Card>
          </>
        )}

      </div>
    </div>
  );
}
