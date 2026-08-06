/**
 * app/[slug]/not-found.tsx
 *
 * Shown when a slug resolves to no creator — rendered by the notFound() call
 * in this segment's page.tsx.
 *
 * Distinct from the catch-all app/not-found.tsx because the situation is
 * different: the visitor did not mistype a URL in the address bar, they
 * followed a tip link off a sticker, a poster, or a QR code.  So the wording
 * covers the two things that actually happened — the link was transcribed
 * wrong, or the creator has since changed their slug — and it does not leave
 * a first-time visitor thinking Novatip itself is broken.
 *
 * Note this file cannot read `params`; a not-found boundary receives no props,
 * so the copy stays generic rather than naming the slug that failed.
 *
 * Known limitation — this page renders, but the response carries HTTP 200
 * rather than 404.  loading.tsx in this segment puts a Suspense boundary over
 * the route, so Next flushes the shell (and with it the status) before the
 * creator lookup has resolved, and the later notFound() can no longer change
 * it.  Verified against a production build: with loading.tsx removed the same
 * request returns a genuine 404.  Deleting loading.tsx is the fix, at the cost
 * of the skeleton — a call worth making deliberately rather than in passing.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Creator not found — Novatip",
};

export default function CreatorNotFound() {
  return (
    <>
      <Header />

      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center animate-slide-up">
          <div className="flex flex-col items-center gap-5 py-4">

            <div
              className="flex items-center justify-center h-20 w-20 rounded-full bg-surface-strong ring-4 ring-hairline"
              role="img"
              aria-label="Not found"
            >
              <span className="text-4xl">🔍</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-fg mb-1">
                No tip jar here
              </h1>
              <p className="text-sm text-fg-subtle">
                This link doesn&apos;t belong to any creator. Check the spelling
                — tip links are easy to mistype off a sticker or a printed QR
                code — or the creator may have changed their link.
              </p>
            </div>

            <div className="w-full rounded-xl bg-surface-strong border border-hairline px-4 py-3">
              <p className="text-xs text-fg-faint">
                Tip links look like{" "}
                <span className="font-mono text-accent">novatip.xyz/alice</span>
              </p>
            </div>

            <div className="flex flex-col w-full gap-3">
              <Link href="/" className="w-full">
                <Button size="lg" className="w-full">
                  Back to home
                </Button>
              </Link>
              <Link href="/onboarding" className="w-full">
                <Button size="lg" variant="ghost" className="w-full">
                  Claim this name for yourself
                </Button>
              </Link>
            </div>

          </div>
        </Card>
      </main>
    </>
  );
}
