"use client";

/**
 * app/error.tsx
 *
 * Route error boundary for every segment under app/.
 *
 * Without this, a throw in a server component hands the visitor Next's default
 * error screen — a dead end with no way back and no way to retry.  Tip links
 * arrive from stickers and QR codes, so the visitor usually has no history to
 * go back to either; the route home has to be on the page itself.
 *
 * Must be a client component: Next passes `reset`, which re-renders the failed
 * segment, and a boundary can only exist on the client.
 *
 * This does not catch throws from the root layout — see app/global-error.tsx.
 */

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Next logs this itself in development; in production the message is
    // stripped from the client bundle, so this is what reaches the browser
    // console for anyone debugging a live report.
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <>
      <Header />

      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center animate-slide-up">
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
                Something went wrong
              </h1>
              <p className="text-sm text-fg-subtle">
                This one is on us, not on you. Try again — and if it keeps
                happening, head back home and take another run at it.
              </p>
            </div>

            {/*
              The message is only meaningful in development: Next replaces
              server-side errors with a bare digest in production precisely so
              internals do not leak to visitors.
            */}
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

            <div className="flex flex-col w-full gap-3">
              <Button size="lg" className="w-full" onClick={reset}>
                Try again
              </Button>
              <Link href="/" className="w-full">
                <Button size="lg" variant="ghost" className="w-full">
                  Back to home
                </Button>
              </Link>
            </div>

          </div>
        </Card>
      </main>
    </>
  );
}
