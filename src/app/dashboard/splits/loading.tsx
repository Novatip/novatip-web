/**
 * app/dashboard/splits/loading.tsx
 * Skeleton shown by Next.js while the collaborator splits page loads.
 */
export default function SplitsLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse max-w-2xl">
      {/* Page title skeleton */}
      <div>
        <div className="h-8 w-48 rounded bg-hairline" />
        <div className="h-4 w-96 rounded bg-hairline/50 mt-2" />
        <div className="h-4 w-80 rounded bg-hairline/50 mt-1" />
      </div>

      {/* Splits Config Card skeleton */}
      <div className="rounded-2xl p-6 bg-surface border border-hairline flex flex-col gap-4">
        <div className="mb-4">
          <div className="h-5 w-36 rounded bg-hairline" />
        </div>

        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-1 h-10 rounded-xl bg-hairline" />
              <div className="w-28 h-10 rounded-xl bg-hairline" />
              <div className="w-6 h-10 rounded bg-hairline" />
            </div>
          ))}
        </div>
      </div>

      {/* Info card skeleton */}
      <div className="rounded-xl border border-hairline bg-surface px-4 py-3 h-14" />
    </div>
  );
}
