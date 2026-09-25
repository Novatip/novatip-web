"use client";

/**
 * app/dashboard/layout.tsx
 *
 * Dashboard shell — guards the route (wallet must be connected),
 * renders the sidebar nav, and wraps all dashboard pages.
 *
 * The top bar also shows the creator's tip link with a one-click copy
 * control so they never have to navigate to the QR page just to grab it.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { authApi } from "@/lib/api";
import { getTipUrl } from "@/lib/tipUrl";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { CopyFallback } from "@/components/CopyFallback";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",          label: "Overview",  icon: "📊" },
  { href: "/dashboard/history",  label: "History",   icon: "📜" },
  { href: "/dashboard/splits",   label: "Splits",    icon: "✂️"  },
  { href: "/dashboard/qr",       label: "QR & Link", icon: "🔗" },
];

// ── Tip-link copy control ─────────────────────────────────────────────────────

/**
 * TipLinkCopy
 *
 * Shows the creator's tip URL with a copy button in the dashboard header.
 * On narrow viewports the URL text is hidden but the button stays visible
 * so the affordance is always reachable.
 *
 * Failure surfaces via CopyFallback — the same pattern used by QRDownload —
 * so there is no silent no-op when the browser withholds the clipboard.
 */
function TipLinkCopy({ slug }: { slug: string }) {
  const tipUrl = getTipUrl(slug);
  const { copied, failed, copy, reset } = useCopyToClipboard();

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors",
          failed
            ? "border-danger/30 bg-danger/10"
            : "border-hairline bg-surface-strong",
        )}
      >
        {/* URL text — hidden on xs so the bar doesn't overflow on phones */}
        <span
          className="hidden sm:block text-xs font-mono text-fg-subtle truncate max-w-[180px] lg:max-w-[260px]"
          aria-hidden="true"
        >
          {tipUrl}
        </span>

        <button
          type="button"
          onClick={() => copy(tipUrl)}
          aria-label={copied ? "Link copied" : "Copy your tip link"}
          className={cn(
            "shrink-0 text-xs font-medium transition-colors",
            failed
              ? "text-danger hover:text-danger"
              : copied
              ? "text-success"
              : "text-accent hover:text-accent-strong",
          )}
        >
          {failed ? "Failed" : copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      {/* Manual fallback when the browser refuses the clipboard */}
      {failed && (
        <CopyFallback
          text={tipUrl}
          onDismiss={reset}
          noun="tip link"
          className="max-w-xs"
        />
      )}
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting, publicKey, jwt } = useWallet();
  const router   = useRouter();
  const pathname = usePathname();
  const [sessionKey, setSessionKey] = useState(0);
  const [slug, setSlug] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Fetch the creator's slug once per session so the copy control in the
  // header always reflects the current wallet without hitting /auth/me on
  // every page navigation.
  useEffect(() => {
    if (!jwt) { setSlug(null); return; }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    authApi
      .me(jwt, { signal: controller.signal })
      .then((r) => {
        if (abortControllerRef.current === controller) {
          setSlug(r.user.slug);
        }
      })
      .catch((e: any) => {
        if (e.code === "ABORTED") return;
        setSlug(null);
      })
      .finally(() => {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      });

    return () => { abortControllerRef.current?.abort(); };
  }, [jwt]);

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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <Image
              src="/logo.svg"
              alt=""
              width={24}
              height={24}
              className="rounded"
              unoptimized
            />
            <span className="font-semibold text-fg group-hover:text-accent transition-colors">
              Novatip
            </span>
            <span className="text-fg-dim text-sm hidden sm:block">/ Dashboard</span>
          </Link>

          {/* Tip-link copy — only rendered once the slug is known */}
          {slug && (
            <div className="flex-1 flex justify-center">
              <TipLinkCopy slug={slug} />
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
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
