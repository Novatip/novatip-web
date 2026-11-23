"use client";

/**
 * components/ui/ErrorPanel.tsx
 *
 * Inline error banner with a retry control, for a panel that failed to load
 * on its own — refetching just that panel instead of sending the visitor to
 * a full page reload, which would re-run every other request on the page too.
 */

import { Button } from "@/components/ui/Button";

interface ErrorPanelProps {
  message: string;
  onRetry: () => void;
  /** Disables the retry control while a retry is already in flight. */
  retrying?: boolean;
}

export function ErrorPanel({ message, onRetry, retrying = false }: ErrorPanelProps) {
  return (
    <div
      role="alert"
      className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 flex items-center justify-between gap-3"
    >
      <p className="text-sm text-danger">{message}</p>
      <Button
        variant="danger"
        size="sm"
        loading={retrying}
        onClick={onRetry}
        aria-label="Retry loading this panel"
      >
        Retry
      </Button>
    </div>
  );
}
