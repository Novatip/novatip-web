/**
 * app/dashboard/nav.ts
 *
 * Sidebar entries for the dashboard shell. Every href must map to a real
 * app/dashboard route — nav.test.ts enforces that, so an entry cannot be
 * added ahead of the page it points at.
 */

export const NAV_ITEMS = [
  { href: "/dashboard",          label: "Overview",  icon: "📊" },
  { href: "/dashboard/history",  label: "History",   icon: "📜" },
  { href: "/dashboard/splits",   label: "Splits",    icon: "✂️"  },
  { href: "/dashboard/qr",       label: "QR & Link", icon: "🔗" },
] as const;
