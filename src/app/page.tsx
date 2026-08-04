import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-fg mb-6">
          Tip any creator in{" "}
          <span className="text-gradient">2 seconds</span>
        </h1>
        <p className="text-xl text-fg-subtle mb-10 max-w-2xl mx-auto">
          Cross-border micro-tipping for creators, streamers, and street
          musicians. Powered by Stellar USDC — no middlemen, no big cuts.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/onboarding">
            <Button size="lg">Create your tip jar</Button>
          </Link>
          <Link href="/alice">
            <Button size="lg" variant="secondary">See a demo page</Button>
          </Link>
        </div>
      </main>
    </>
  );
}
