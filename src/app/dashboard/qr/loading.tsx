/**
 * app/dashboard/qr/loading.tsx
 * Skeleton shown by Next.js while the QR Code & Link page loads.
 */
export default function QRLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse max-w-md">
      {/* Page title skeleton */}
      <div>
        <div className="h-8 w-40 rounded bg-hairline" />
        <div className="h-4 w-80 rounded bg-hairline/50 mt-2" />
      </div>

      {/* QR Code Container skeleton */}
      <div className="flex flex-col items-center gap-4">
        <div className="h-52 w-52 rounded-2xl bg-hairline" />
        <div className="h-10 w-64 rounded-xl bg-hairline" />
      </div>
    </div>
  );
}
