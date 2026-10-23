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
import { usePathname } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { ApiError, authApi } from "@/lib/api";
import { getTipUrl } from "@/lib/tipUrl";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { CopyFallback } from "@/components/CopyFallback";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

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
          <svg className="h-4 w-4 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {failed ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : copied ? (
              <path d="M5 12l4 4L19 6" />
            ) : (
              <>
                <rect x="8" y="8" width="12" height="12" rx="2" />
                <path d="M16 8V4H4v12h4" />
              </>
            )}
          </svg>
          <span className="sr-only sm:not-sr-only">
            {failed ? "Failed" : copied ? "Copied!" : "Copy link"}
          </span>
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
  const { isConnected, publicKey, jwt, isSigningIn, retrySignIn, error: walletError } = useWallet();
  const pathname = usePathname();
  const [sessionKey, setSessionKey] = useState(0);
  const [slug, setSlug] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // When a wallet connects or a different wallet connects, increment
  // sessionKey to force every dashboard child to remount and re-fetch. This
  // ensures creator-specific data is never visible from a previous session — on a
  // shared machine, the previous creator's figures would otherwise linger until
  // a navigation happens to remount the components.
  // Both isConnected and publicKey are listed in dependencies so ESLint is satisfied
  // and the effect triggers when identity or connection changes, while the if (isConnected)
  // check avoids remounts during disconnection.
  useEffect(() => {
    if (isConnected) {
      setSessionKey((k) => k + 1);
    }
  }, [isConnected, publicKey]);

  // Guard: a disconnected visitor sees an in-place connect prompt (below).
  // We intentionally do NOT also call router.replace("/") here — doing both
  // caused a race where the prompt painted and was then navigated away from
  // before the creator could press it. One behaviour is enough; the prompt
  // is the better choice because it gives the user a clear, immediate action
  // and does not navigate them away from a page they deliberately opened.

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
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "ABORTED") return;
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

  // The wallet is connected, but the creator session (SIWS) has not been
  // established — either sign-in is still in progress, or it failed. Every
  // dashboard page fetches data with useAbortableRequest, which starts in a
  // loading state and only leaves it when `run` is called. Those pages guard
  // `run` behind `if (!jwt) return`, so without this check a connected wallet
  // with no session leaves every page on its loading skeleton forever.
  if (!jwt) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        {isSigningIn ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-accent" />
            <p className="text-fg-subtle text-sm">Signing you in…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 max-w-sm text-center">
            <p className="text-fg-subtle text-sm">
              {walletError ?? "Your wallet is connected, but you need to sign in to access the dashboard."}
            </p>
            <Button size="lg" onClick={() => void retrySignIn()}>
              Sign in
            </Button>
          </div>
        )}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <WalletConnectButton size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="Novatip home">
            <Image
              src="/logo.svg"
              alt=""
              width={24}
              height={24}
              className="rounded"
              unoptimized
            />
            <span className="hidden sm:inline font-semibold text-fg group-hover:text-accent transition-colors">
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

      {/* Mobile nav */}
      <nav
        className="md:hidden border-b border-hairline bg-surface/50 px-4 py-2 flex items-center justify-around gap-1 overflow-x-auto"
        aria-label="Dashboard navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                isActive
                  ? "bg-brand-500/20 text-accent border border-brand-500/20"
                  : "text-fg-subtle hover:text-fg hover:bg-surface-strong",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-base" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

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
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 outline-none" key={sessionKey}>
          {children}
        </main>

      </div>
    </div>
  );
}
