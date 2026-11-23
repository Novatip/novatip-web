/**
 * Footer.tsx
 *
 * Project links shown at the bottom of the public pages: the source, the docs
 * and the security policy. Without it a visitor has no way to reach any of
 * them from the app.
 *
 * Every link leaves the app, so each opens in a new tab with
 * rel="noopener noreferrer" and says so to screen readers.
 */

import { cn } from "@/lib/utils";

export const FOOTER_LINKS = [
  { label: "GitHub", href: "https://github.com/Novatip" },
  { label: "Docs", href: "https://novatip-docs.pages.dev" },
  {
    label: "Security policy",
    href: "https://github.com/Novatip/novatip-docs/blob/main/SECURITY.md",
  },
] as const;

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn("w-full border-t border-hairline", className)}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-xs text-fg-dim">Novatip — open-source tipping on Stellar.</p>
        <nav aria-label="Project links">
          <ul className="flex items-center gap-4">
            {FOOTER_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded text-sm text-fg-subtle transition-colors hover:text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                  {label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
