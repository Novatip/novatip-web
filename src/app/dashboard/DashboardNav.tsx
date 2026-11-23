"use client";

/**
 * app/dashboard/DashboardNav.tsx
 *
 * The dashboard link list, rendered as a labelled nav landmark. The layout
 * mounts it twice — a horizontal bar on small screens and a vertical sidebar
 * from the md breakpoint up — so only the layout classes differ between them.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

type DashboardNavLayout = "bar" | "sidebar";

const NAV_CLASSES: Record<DashboardNavLayout, string> = {
  bar: "md:hidden border-b border-hairline bg-surface/50 px-4 py-2 flex items-center justify-around gap-1 overflow-x-auto",
  sidebar: "hidden md:flex flex-col gap-1 w-48 shrink-0",
};

const LINK_CLASSES: Record<DashboardNavLayout, string> = {
  bar: "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
  sidebar: "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
};

export function DashboardNav({ layout }: { layout: DashboardNavLayout }) {
  const pathname = usePathname();

  return (
    <nav className={NAV_CLASSES[layout]} aria-label="Dashboard navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              LINK_CLASSES[layout],
              isActive
                ? "bg-brand-500/20 text-accent border border-brand-500/20"
                : "text-fg-subtle hover:text-fg hover:bg-surface-strong",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="text-base" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
