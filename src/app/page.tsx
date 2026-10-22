import { Suspense } from "react";
import { Header } from "@/components/Header";
import { LinkButton } from "@/components/ui/LinkButton";
import { ConnectPrompt } from "@/components/ConnectPrompt";

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-24 text-center outline-none">
        <Suspense fallback={null}>
          <ConnectPrompt />
        </Suspense>
        <h1 className="text-5xl font-bold tracking-tight text-fg mb-6">
          Tip any creator in{" "}
          <span className="text-gradient">2 seconds</span>
        </h1>
        <p className="text-xl text-fg-subtle mb-10 max-w-2xl mx-auto">
          Cross-border micro-tipping for creators, streamers, and street
          musicians. Powered by Stellar USDC — no middlemen, no big cuts.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <LinkButton href="/onboarding" size="lg">Create your tip jar</LinkButton>
          <LinkButton href="/demo" size="lg" variant="secondary">See a demo page</LinkButton>
        </div>
      </main>
    </>
  );
}
