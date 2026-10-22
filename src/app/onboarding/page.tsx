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

import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { SlugStep }      from "@/components/onboarding/SlugStep";
import { SplitsStep }    from "@/components/onboarding/SplitsStep";
import { ShareStep }     from "@/components/onboarding/ShareStep";
import { ThemeToggle }   from "@/components/ThemeToggle";
import { Card }          from "@/components/ui/Card";
import { Button }        from "@/components/ui/Button";
import { authApi, creatorApi } from "@/lib/api";
import { isTempSlug } from "@/lib/onboarding";
import Link from "next/link";

const STEP_LABELS = ["Claim slug", "Set splits", "Share"];

export default function OnboardingPage() {
  const { isConnected, jwt, error, isSigningIn, retrySignIn } = useWallet();
  const [step, setStep] = useState(0);
  const [slug, setSlug] = useState("");
  const [resumedJwt, setResumedJwt] = useState<string | null>(null);
  const resuming = !!jwt && resumedJwt !== jwt;

  // A returning creator who already claimed a slug should not be dropped
  // back at step one. A temporary slug (the backend's default for every new
  // sign-in) means there is nothing to resume; a real one means picking up
  // at splits, or share if splits were saved too.
  useEffect(() => {
    if (!jwt) {
      setResumedJwt(null);
      return;
    }
    let cancelled = false;
    setStep(0);
    setSlug("");

    (async () => {
      try {
        const { user } = await authApi.me(jwt);
        if (cancelled || isTempSlug(user.slug)) return;

        setSlug(user.slug);
        const { creator } = await creatorApi.getBySlug(user.slug);
        if (cancelled) return;
        setStep(creator.splits.length > 0 ? 2 : 1);
      } catch {
        // Not resumable — fall back to starting fresh.
      } finally {
        if (!cancelled) setResumedJwt(jwt);
      }
    })();

    return () => { cancelled = true; };
  }, [jwt]);

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen flex flex-col items-center justify-center px-4 py-12 outline-none">

      {/* Back link */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-fg-faint hover:text-fg-muted transition-colors">
          ← Back
        </Link>
        <ThemeToggle />
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
            {!resuming && (
              <StepIndicator
                currentStep={step}
                totalSteps={STEP_LABELS.length}
                labels={STEP_LABELS}
              />
            )}

            {/* Step content */}
            <Card>
              {!jwt ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-sm text-fg-subtle text-center">
                    Your wallet is connected. Sign in to continue creating your tip jar.
                  </p>
                  {error && (
                    <p role="alert" className="text-sm text-danger text-center">{error}</p>
                  )}
                  <Button size="lg" className="w-full" loading={isSigningIn} onClick={retrySignIn}>
                    {isSigningIn ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              ) : resuming ? (
                <p className="text-sm text-fg-subtle text-center py-8">
                  Checking your progress…
                </p>
              ) : (
                <>
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
                </>
              )}
            </Card>
          </>
        )}

      </div>
    </main>
  );
}
