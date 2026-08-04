"use client";

/**
 * onboarding/StepIndicator.tsx
 * Progress bar for the 3-step onboarding wizard.
 */

import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps:  number;
  labels:      string[];
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 w-full" role="list" aria-label="Onboarding steps">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const state =
          i < currentStep ? "done" : i === currentStep ? "active" : "upcoming";
        return (
          <div key={i} className="flex items-center gap-2 flex-1" role="listitem">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                  state === "done"
                    ? "bg-brand-500 border-brand-500 text-white"
                    : state === "active"
                    ? "border-brand-500 text-accent bg-brand-500/10"
                    : "border-hairline-strong text-fg-dim bg-surface-strong",
                )}
                aria-current={state === "active" ? "step" : undefined}
              >
                {state === "done" ? "✓" : i + 1}
              </div>
              <span className={cn(
                "text-xs hidden sm:block",
                state === "active" ? "text-accent font-medium" : "text-fg-dim",
              )}>
                {labels[i]}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div className={cn(
                "flex-1 h-0.5 rounded-full transition-all",
                i < currentStep ? "bg-brand-500" : "bg-hairline",
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
