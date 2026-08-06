/**
 * app/not-found.tsx
 *
 * Catch-all 404 for URLs that match no route — /foo/bar, a stale dashboard
 * path, a truncated share link.
 *
 * An unknown *creator slug* is a different situation with its own wording;
 * that one is handled by app/[slug]/not-found.tsx.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Page not found — Novatip",
};

export default function NotFound() {
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
              <span className="text-4xl">🧭</span>
            </div>

            <div>
              <p className="text-5xl font-bold text-gradient mb-2">404</p>
              <h1 className="text-2xl font-bold text-fg mb-1">
                Page not found
              </h1>
              <p className="text-sm text-fg-subtle">
                That link doesn&apos;t lead anywhere. It may have been mistyped,
                or the page may have moved.
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
                  Create your tip jar
                </Button>
              </Link>
            </div>

          </div>
        </Card>
      </main>
    </>
  );
}
