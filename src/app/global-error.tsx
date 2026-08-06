"use client";

/**
 * app/global-error.tsx
 *
 * Last-resort boundary for throws in the root layout itself.
 *
 * app/error.tsx renders *inside* the root layout, so it can do nothing when
 * that layout is what failed — the visitor gets the default Next error screen
 * instead.  This file replaces the whole document, which is why it has to
 * supply its own <html> and <body>.
 *
 * Everything here is deliberately self-contained: no Tailwind classes, no
 * shared components, no theme script.  Those all come from the tree that just
 * failed, and a boundary that depends on the thing it is catching is no
 * boundary at all.  Colours are the same tokens globals.css uses, inlined, and
 * follow the OS theme since the class-based one never got applied.
 */

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const STYLES = `
  .novatip-fatal {
    --canvas: #f8fafc;
    --surface: #ffffff;
    --hairline: #e2e8f0;
    --fg: #0f172a;
    --fg-subtle: #475569;
    --fg-faint: #64748b;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    .novatip-fatal {
      --canvas: #030712;
      --surface: #111827;
      --hairline: #262f3e;
      --fg: #f3f4f6;
      --fg-subtle: #9ca3af;
      --fg-faint: #6b7280;
      color-scheme: dark;
    }
  }
  .novatip-fatal {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: var(--canvas);
    color: var(--fg);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .novatip-fatal__card {
    width: 100%;
    max-width: 28rem;
    text-align: center;
    padding: 2rem 1.5rem;
    border-radius: 1rem;
    background: var(--surface);
    border: 1px solid var(--hairline);
  }
  .novatip-fatal__icon { font-size: 2.5rem; line-height: 1; }
  .novatip-fatal__title { margin: 1rem 0 0.5rem; font-size: 1.5rem; font-weight: 700; }
  .novatip-fatal__body { margin: 0; font-size: 0.875rem; color: var(--fg-subtle); }
  .novatip-fatal__digest {
    margin: 1rem 0 0;
    font-size: 0.75rem;
    color: var(--fg-faint);
    font-family: ui-monospace, monospace;
  }
  .novatip-fatal__actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  .novatip-fatal__button {
    display: block;
    padding: 0.875rem 1.75rem;
    border: 0;
    border-radius: 0.75rem;
    background: #0ea5e9;
    color: #ffffff;
    font: inherit;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
  }
  .novatip-fatal__button:hover { background: #0284c7; }
  .novatip-fatal__button--ghost {
    background: transparent;
    color: var(--fg-subtle);
    border: 1px solid var(--hairline);
  }
  .novatip-fatal__button--ghost:hover { background: var(--canvas); color: var(--fg); }
`;

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="novatip-fatal">
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />

        <div className="novatip-fatal__card">
          <div className="novatip-fatal__icon" role="img" aria-label="Error">
            💥
          </div>

          <h1 className="novatip-fatal__title">Novatip hit a snag</h1>
          <p className="novatip-fatal__body">
            The page couldn&apos;t be loaded. Reloading usually clears it.
          </p>

          {error.digest && (
            <p className="novatip-fatal__digest">Reference: {error.digest}</p>
          )}

          <div className="novatip-fatal__actions">
            <button type="button" className="novatip-fatal__button" onClick={reset}>
              Try again
            </button>
            {/*
              A plain anchor, not next/link — the router lives in the tree that
              failed, so a full document load is the reliable way out.
            */}
            <a href="/" className="novatip-fatal__button novatip-fatal__button--ghost">
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
