/**
 * Skeleton shown by Next.js while the settings page suspends.
 */
export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl animate-pulse">
      <div className="h-8 w-44 rounded-xl bg-hairline" />
      <div className="h-4 w-80 rounded bg-hairline/60" />
      <div className="rounded-2xl bg-surface border border-hairline p-6 flex flex-col gap-5">
        <div className="h-5 w-32 rounded bg-hairline" />
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-hairline shrink-0" />
          <div className="flex-1 h-10 rounded-xl bg-hairline" />
        </div>
        <div className="h-10 rounded-xl bg-hairline" />
        <div className="h-24 rounded-xl bg-hairline" />
        <div className="h-10 w-32 rounded-xl bg-hairline" />
      </div>
    </div>
  );
}
