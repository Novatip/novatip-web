"use client";

/**
 * ConnectionBanner.tsx
 *
 * Shown above every page while the backend is unreachable (network failure or
 * timeout). The server may be waking from a cold start, so the copy sets that
 * expectation. It clears itself on the next successful response.
 */

import { useConnection } from "@/contexts/ConnectionContext";

export function ConnectionBanner() {
  const { isBackendUnreachable } = useConnection();

  if (!isBackendUnreachable) return null;

  return (
    <div
      role="status"
      className="bg-warning/10 border-b border-warning/20 px-4 py-2 text-center text-sm text-warning"
    >
      Connecting to the server… it may be waking up from a cold start.
    </div>
  );
}
