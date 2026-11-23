"use client";

/**
 * ConnectPrompt.tsx
 *
 * Honours the `?connect=true` redirect that useAuth's requireAuth() sends
 * unauthenticated users to. Auto-triggers the Freighter connect flow and
 * explains why, then returns the user to `redirect` (if present) once
 * connected.
 */

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";

export function ConnectPrompt() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const wallet = useWallet();
  const attemptedConnect = useRef(false);

  const shouldConnect = searchParams.get("connect") === "true";
  const redirectTo = searchParams.get("redirect");

  useEffect(() => {
    if (!shouldConnect || wallet.isConnected || attemptedConnect.current) return;
    attemptedConnect.current = true;
    void wallet.connect();
  }, [shouldConnect, wallet]);

  useEffect(() => {
    if (!shouldConnect || !wallet.isConnected) return;
    if (!redirectTo || !redirectTo.startsWith("/")) return;
    // Only ever follow a same-site path. Resolve it the way the browser will
    // (which reads "\" as "/") and require the origin to be unchanged, so
    // "//host", "/\host" and absolute URLs are all refused.
    let target: URL;
    try {
      target = new URL(redirectTo, window.location.origin);
    } catch {
      return;
    }
    if (target.origin !== window.location.origin) return;
    router.replace(`${target.pathname}${target.search}${target.hash}`);
  }, [shouldConnect, wallet.isConnected, redirectTo, router]);

  if (!shouldConnect || wallet.isConnected) return null;

  return (
    <p className="mb-8 mx-auto max-w-md rounded-lg border border-hairline bg-surface-strong px-4 py-3 text-sm text-fg-subtle">
      {wallet.isConnecting
        ? "Connecting your wallet…"
        : "That page needs a connected wallet — approve the request in Freighter to continue."}
    </p>
  );
}
