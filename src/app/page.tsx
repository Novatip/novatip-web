import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LinkButton } from "@/components/ui/LinkButton";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { Card } from "@/components/ui/Card";

export default function HomePage() {
  // Literal member access so Next inlines it at build time. Unset hides the
  // demo button: there is no /demo route, so the link only works when a
  // creator owns that slug.
  const demoSlug = process.env.NEXT_PUBLIC_DEMO_SLUG?.trim();

  return (
    <>
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-4xl px-4 py-24 text-center outline-none"
      >
        <Suspense fallback={null}>
          <ConnectPrompt />
        </Suspense>
        <h1 className="text-5xl font-bold tracking-tight text-fg mb-6">
          Tip any creator in <span className="text-gradient">2 seconds</span>
        </h1>
        <p className="text-xl text-fg-subtle mb-10 max-w-2xl mx-auto">
          Cross-border micro-tipping for creators, streamers, and street musicians. Powered by
          Stellar USDC — no middlemen, no big cuts.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <LinkButton href="/onboarding" size="lg">
            Create your tip jar
          </LinkButton>
          {demoSlug && (
            <LinkButton href={`/${encodeURIComponent(demoSlug)}`} size="lg" variant="secondary">
              See a demo page
            </LinkButton>
          )}
        </div>

        {/* How it works section */}
        <section className="mt-16 mb-16">
          <h2 className="text-3xl font-bold text-fg mb-8">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <Card glass={false}>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 text-brand-500 font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-fg mb-2">Claim your link</h3>
              <p className="text-sm text-fg-subtle">
                Connect your Stellar wallet and claim a unique tip link. No signup, no personal info required.
              </p>
            </Card>

            <Card glass={false}>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 text-brand-500 font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-fg mb-2">Share your QR code</h3>
              <p className="text-sm text-fg-subtle">
                Download your QR code and share it anywhere — stream overlays, social media, or printed cards.
              </p>
            </Card>

            <Card glass={false}>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 text-brand-500 font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-fg mb-2">Get paid and split</h3>
              <p className="text-sm text-fg-subtle">
                Receive tips in USDC instantly. Add collaborators to automatically split earnings.
              </p>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
