"use client";

/**
 * app/dashboard/error.tsx
 *
 * Segment-level error boundary for the dashboard.
 *
 * Without this, a throw in any dashboard page falls through to the root
 * app/error.tsx, which replaces the entire screen — sidebar, header and all.
 * This boundary sits inside app/dashboard/layout.tsx's <main>, so the shell
 * around it stays mounted and a creator never loses their nav just because
 * one page broke.
 *
 * Must be a client component: Next passes `reset`, which re-renders the
 * failed segment, and a boundary can only exist on the client.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("Unhandled dashboard error:", error);
  }, [error]);

  return (
    <Card className="w-full max-w-md mx-auto text-center animate-slide-up">
      <div className="flex flex-col items-center gap-5 py-4">

        <div
          className="flex items-center justify-center h-20 w-20 rounded-full bg-danger/15 ring-4 ring-danger/20"
          role="img"
          aria-label="Error"
        >
          <span className="text-4xl">⚠️</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-fg mb-1">
            This page hit a snag
          </h1>
          <p className="text-sm text-fg-subtle">
            The rest of your dashboard is fine — just this page. Try again.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && error.message && (
          <p className="w-full rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 text-xs text-danger font-mono break-words text-left">
            {error.message}
          </p>
        )}

        {error.digest && (
          <p className="text-xs text-fg-faint font-mono">
            Reference: {error.digest}
          </p>
        )}

        <Button size="lg" className="w-full" onClick={reset}>
          Try again
        </Button>

      </div>
    </Card>
  );
}
