"use client";

/**
 * app/dashboard/layout.tsx
 *
 * Dashboard shell — guards the route (wallet must be connected),
 * renders the sidebar nav, and wraps all dashboard pages.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",          label: "Overview",  icon: "📊" },
  { href: "/dashboard/history",  label: "History",   icon: "📜" },
  { href: "/dashboard/splits",   label: "Splits",    icon: "✂️"  },
  { href: "/dashboard/qr",       label: "QR & Link", icon: "🔗" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting, publicKey } = useWallet();
  const router   = useRouter();
  const pathname = usePathname();
  const [sessionKey, setSessionKey] = useState(0);

  // When the wallet disconnects (or a different wallet connects), increment
  // sessionKey to force every dashboard child to remount and re-fetch. This
  // ensures creator-specific data is never visible after a disconnect — on a
  // shared machine, the previous creator's figures would otherwise linger until
  // a navigation happens to remount the components.
  useEffect(() => {
    if (isConnected) {
      setSessionKey((k) => k + 1);
    }
  }, [publicKey]);

  // Redirect unauthenticated users to home
  useEffect(() => {
    if (!isConnecting && !isConnected) {
      router.replace("/");
    }
  }, [isConnected, isConnecting, router]);

  if (!isConnected) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <p className="text-fg-subtle text-sm">Connect your wallet to access the dashboard</p>
        <WalletConnectButton size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl">💸</span>
            <span className="font-semibold text-fg group-hover:text-accent transition-colors">
              Novatip
            </span>
            <span className="text-fg-dim text-sm hidden sm:block">/ Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <WalletConnectButton size="sm" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 gap-8">

        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-1 w-48 shrink-0">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                pathname === item.href
                  ? "bg-brand-500/20 text-accent border border-brand-500/20"
                  : "text-fg-subtle hover:text-fg hover:bg-surface-strong",
              )}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <span className="text-base" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </aside>

        {/* Page content */}
        <main className="flex-1 min-w-0" key={sessionKey}>
          {children}
        </main>

      </div>
    </div>
  );
}
