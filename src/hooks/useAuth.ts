"use client";

/**
 * hooks/useAuth.ts
 *
 * Convenience hook that returns the current auth state and guards.
 * Components that require authentication can call requireAuth()
 * which redirects to the connect flow if not connected.
 */

import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";

export function useAuth() {
  const wallet = useWallet();
  const router = useRouter();

  function requireAuth() {
    if (!wallet.isConnected) {
      router.push("/?connect=true");
      return false;
    }
    return true;
  }

  return {
    ...wallet,
    requireAuth,
  };
}
