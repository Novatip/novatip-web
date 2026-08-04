/**
 * app/[slug]/loading.tsx
 * Skeleton shown by Next.js while the tip page data loads.
 */
export default function TipPageLoading() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header skeleton */}
      <div className="h-16 border-b border-hairline bg-canvas/80 animate-pulse" />

      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-12">
        {/* Avatar skeleton */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="h-20 w-20 rounded-full bg-hairline animate-pulse" />
          <div className="h-6 w-40 rounded-lg bg-hairline animate-pulse" />
          <div className="h-4 w-64 rounded-lg bg-hairline/50 animate-pulse" />
        </div>

        {/* Card skeleton */}
        <div className="rounded-2xl bg-surface border border-hairline p-6 space-y-4">
          <div className="h-4 w-32 rounded bg-hairline animate-pulse" />
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 flex-1 rounded-xl bg-hairline animate-pulse" />
            ))}
          </div>
          <div className="h-12 w-full rounded-xl bg-hairline animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-brand-500/20 animate-pulse" />
        </div>
      </main>
    </div>
  );
}
