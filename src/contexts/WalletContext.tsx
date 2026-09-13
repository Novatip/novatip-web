"use client";

/**
 * contexts/WalletContext.tsx
 *
 * Global wallet state for novatip-web.
 *
 * Provides:
 *   - publicKey          connected Stellar address (or null)
 *   - jwt                session JWT issued by novatip-backend (or null)
 *   - isConnected        boolean convenience flag
 *   - isConnecting       true while the connect flow is in progress
 *   - connect()          trigger Freighter connection + SIWS auth
 *   - disconnect()       clear local session
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { freighter, isFreighterInstalled, signNonce } from "@/lib/wallet";
import { authApi } from "@/lib/api";
import { onUnauthorized } from "@/lib/authEvents";
import { isJwtExpired } from "@/lib/jwt";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WalletState {
  publicKey:    string | null;
  jwt:          string | null;
  isConnected:  boolean;
  isConnecting: boolean;
  error:        string | null;
  connect:      () => Promise<void>;
  disconnect:   () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletState | null>(null);

const JWT_STORAGE_KEY = "novatip_jwt";
const PK_STORAGE_KEY  = "novatip_pk";

// ── Provider ──────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey,    setPublicKey]    = useState<string | null>(null);
  const [jwt,          setJwt]          = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Rehydrate from localStorage on mount. The two are restored independently:
  // a connected wallet with no creator session is the normal state for someone
  // who only came to tip, and requiring both would log them straight back out.
  useEffect(() => {
    const storedPk = localStorage.getItem(PK_STORAGE_KEY);
    if (storedPk) setPublicKey(storedPk);

    const storedJwt = localStorage.getItem(JWT_STORAGE_KEY);
    if (storedJwt) {
      // Skip the guaranteed-failing round trip for a token that's already
      // expired. The server still gets the final say on every other case.
      if (isJwtExpired(storedJwt)) {
        localStorage.removeItem(JWT_STORAGE_KEY);
      } else {
        setJwt(storedJwt);
      }
    }
  }, []);

  // A 401 from any API call means the session is no longer valid (expired or
  // otherwise rejected by the server, which remains the authority). Drop back
  // to disconnected everywhere at once instead of leaving each dashboard
  // widget to fail on its own with an inline error.
  useEffect(() => {
    return onUnauthorized(() => {
      localStorage.removeItem(JWT_STORAGE_KEY);
      localStorage.removeItem(PK_STORAGE_KEY);
      setPublicKey(null);
      setJwt(null);
      setError("Your session has expired. Please reconnect your wallet.");
    });
  }, []);

  /**
   * Exchange a wallet signature for a creator session (SIWS).
   *
   * Only the creator dashboard needs this. Sending a tip does not: the tip is
   * an on-chain transaction the wallet signs directly, and the backend is never
   * in that path. Returns null instead of throwing so a sign-in failure cannot
   * take the wallet connection down with it — the connected `error` state is
   * still set so the failure (rejected, wallet locked, nonce expired) is visible.
   */
  const signIn = useCallback(async (pk: string): Promise<string | null> => {
    try {
      const { nonce } = await authApi.challenge(pk);
      const signatureHex = await signNonce(nonce, pk);
      const { jwt: token } = await authApi.verify(pk, signatureHex);

      localStorage.setItem(JWT_STORAGE_KEY, token);
      setJwt(token);
      return token;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(message);
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!(await isFreighterInstalled())) {
        throw new Error(
          "Freighter wallet extension not found. Install it from freighter.app, then reload this page.",
        );
      }

      // Connecting means one thing: we know which account the user is. That is
      // everything the tip flow requires, so it is committed immediately and
      // nothing after this point can un-connect the wallet.
      const pk = await freighter.getPublicKey();
      localStorage.setItem(PK_STORAGE_KEY, pk);
      setPublicKey(pk);

      // Best-effort creator session for the dashboard. Never blocks a tip.
      void signIn(pk);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet connection failed.";
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, [signIn]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(JWT_STORAGE_KEY);
    localStorage.removeItem(PK_STORAGE_KEY);
    setPublicKey(null);
    setJwt(null);
    setError(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        jwt,
        isConnected:  !!publicKey,
        isConnecting,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
