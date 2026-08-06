"use client";

/**
 * CopyFallback.tsx
 *
 * Shown when a copy attempt fails — see hooks/useCopyToClipboard.
 *
 * Browsers withhold the clipboard on insecure origins (a phone hitting the dev
 * server over the LAN, say), and there is nothing the page can do to force it.
 * The next best thing is to put the text somewhere the user can select it, so
 * the recovery is a long-press away rather than a dead end.
 *
 * The field is focused and pre-selected on mount for exactly that reason: the
 * user has already pressed a button and got nothing, so the copy gesture should
 * be the only step left.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CopyFallbackProps {
  /** The text that could not be copied. */
  text:       string;
  /** Clears the failure — wired to the hook's reset(). */
  onDismiss:  () => void;
  /** What the text is, used in the wording: "select the link", "the message". */
  noun?:      string;
  className?: string;
}

export function CopyFallback({
  text,
  onDismiss,
  noun = "link",
  className,
}: CopyFallbackProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // preventScroll — the field is already in view next to the button that
    // failed, and yanking the viewport would only disorient.
    input.focus({ preventScroll: true });
    input.select();
  }, [text]);

  return (
    <div
      role="alert"
      className={cn(
        "w-full flex flex-col gap-2",
        "rounded-xl border border-danger/30 bg-danger/10 px-4 py-3",
        className,
      )}
    >
      <p className="text-xs text-danger">
        Couldn&apos;t copy automatically. Select the {noun} below and copy it manually.
      </p>

      <input
        ref={inputRef}
        readOnly
        value={text}
        onFocus={(event) => event.currentTarget.select()}
        aria-label={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} to copy manually`}
        className={cn(
          "w-full rounded-lg px-3 py-2",
          "bg-surface-strong border border-hairline",
          "text-xs font-mono text-fg select-all",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/50",
        )}
      />

      <button
        type="button"
        onClick={onDismiss}
        className="self-end text-xs text-fg-subtle hover:text-fg transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}
