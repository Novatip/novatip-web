/**
 * app/dashboard/loading.tsx
 * Skeleton shown by Next.js while the dashboard overview page loads.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Page title */}
      <div>
        <div className="h-8 w-32 rounded bg-white/10" />
        <div className="h-4 w-64 rounded bg-white/5 mt-2" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-6 bg-white/5 border border-white/10 flex flex-col gap-2">
            <div className="h-3 w-16 rounded bg-white/5 uppercase tracking-wider" />
            <div className="h-8 w-24 rounded bg-white/10 mt-1" />
            <div className="h-3.5 w-20 rounded bg-white/5" />
          </div>
        ))}
      </div>

      {/* Two-column lower section skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tips Card Skeleton */}
        <div className="rounded-2xl p-6 bg-white/5 border border-white/10 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <div className="h-5 w-28 rounded bg-white/10" />
            <div className="h-4 w-12 rounded bg-white/5" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 rounded bg-white/10" />
                  <div className="h-3 w-48 rounded bg-white/5" />
                </div>
                <div className="h-4 w-12 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>

        {/* Top Supporters Card Skeleton */}
        <div className="rounded-2xl p-6 bg-white/5 border border-white/10 flex flex-col gap-4">
          <div className="mb-2">
            <div className="h-5 w-36 rounded bg-white/10" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10" />
                <div className="flex-1 h-4 rounded bg-white/10" />
                <div className="h-4 w-16 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
