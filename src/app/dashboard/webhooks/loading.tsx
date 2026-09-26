/**
 * Skeleton shown by Next.js while the webhooks page suspends.
 */
export default function WebhooksLoading() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-hairline" />
      <div className="h-4 w-72 rounded bg-hairline/60" />
      <div className="rounded-2xl bg-surface border border-hairline p-6 flex flex-col gap-4">
        <div className="h-5 w-32 rounded bg-hairline" />
        <div className="h-10 w-full rounded-xl bg-hairline" />
        <div className="h-10 w-36 rounded-xl bg-hairline" />
      </div>
      <div className="rounded-2xl bg-surface border border-hairline p-6 flex flex-col gap-3">
        <div className="h-5 w-44 rounded bg-hairline" />
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 h-5 rounded-lg bg-hairline" />
            <div className="w-16 h-8 rounded-lg bg-hairline" />
          </div>
        ))}
      </div>
    </div>
  );
}
