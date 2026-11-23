/**
 * SkipLink.tsx
 *
 * First focusable element on every page. Lets a keyboard user jump straight
 * to the main content instead of tabbing through the sticky header (and, on
 * the dashboard, the sidebar) on every single navigation.
 */

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
    >
      Skip to content
    </a>
  );
}
