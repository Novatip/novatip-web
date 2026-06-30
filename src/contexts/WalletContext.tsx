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
import { freighter, getNetworkConfig } from "@/lib/wallet";
import { authApi } from "@/lib/api";

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

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const storedJwt = localStorage.getItem(JWT_STORAGE_KEY);
    const storedPk  = localStorage.getItem(PK_STORAGE_KEY);
    if (storedJwt && storedPk) {
      setJwt(storedJwt);
      setPublicKey(storedPk);
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!freighter.isAvailable()) {
        throw new Error("Freighter wallet extension not found. Please install it from freighter.app");
      }

      // 1. Get the public key from Freighter
      const pk = await freighter.getPublicKey();

      // 2. Request a SIWS challenge nonce from the backend
      const { nonce } = await authApi.challenge(pk);

      // 3. Sign the nonce with Freighter
      //    Freighter signs the raw nonce as a transaction-less message
      const network  = getNetworkConfig();
      const signedXdr = await freighter.signTransaction(nonce, network.passphrase);

      // 4. Verify with backend — exchange signature for JWT
      //    We pass the signed XDR as signatureHex and pk as publicKeyHex
      //    (backend handles the encoding)
      const { jwt: token } = await authApi.verify(pk, signedXdr, pk);

      // 5. Persist session
      localStorage.setItem(JWT_STORAGE_KEY, token);
      localStorage.setItem(PK_STORAGE_KEY, pk);
      setPublicKey(pk);
      setJwt(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet connection failed.";
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

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
