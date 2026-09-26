"use client";

/**
 * onboarding/SlugStep.tsx
 * Step 1 — claim a unique public slug.
 */

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { creatorApi } from "@/lib/api";
import { jarIdForSlug, readJar } from "@/lib/jar";
import { useWallet } from "@/contexts/WalletContext";
import { getTipUrl } from "@/lib/tipUrl";

interface SlugStepProps {
  jwt:      string;
  onNext:   (slug: string) => void;
}

/**
 * A slug is only free when both the backend and the contract agree. The
 * backend knows about claimed creator rows; the contract knows about jar ids,
 * which anyone may register directly. A jar already owned by this wallet is
 * fine — syncJarToChain adopts it rather than calling create_jar again.
 */
async function checkAvailability(
  slug: string,
  owner: string | null,
  signal: AbortSignal,
): Promise<{ available: boolean; takenOnChain: boolean }> {
  const [backend, jar] = await Promise.all([
    creatorApi.checkSlug(slug, { signal }),
    readJar(jarIdForSlug(slug)),
  ]);
  const takenOnChain = jar !== null && jar.owner !== owner;
  return { available: backend.available && !takenOnChain, takenOnChain };
}

export function SlugStep({ jwt, onNext }: SlugStepProps) {
  const { publicKey } = useWallet();
  const [slug,      setSlug]      = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [onChain,   setOnChain]   = useState(false);
  const [checking,  setChecking]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const slugValid = /^[a-z0-9_-]{3,32}$/.test(slug);

  // Debounced availability check
  useEffect(() => {
    if (!slugValid) { setAvailable(null); return; }
    setAvailable(null);
    setChecking(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      checkAvailability(slug, publicKey, controller.signal)
        .then((r) => {
          if (controller.signal.aborted) return;
          setAvailable(r.available);
          setOnChain(r.takenOnChain);
        })
        .catch((e: any) => {
          if (e.code === "ABORTED" || controller.signal.aborted) return;
          setAvailable(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setChecking(false);
          }
        });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, slugValid, publicKey]);

  async function handleClaim() {
    if (!slugValid || checking || !available) return;
    setSaving(true);
    setError(null);
    try {
      // Re-read the contract right before claiming: the debounced check may
      // be stale, and a jar registered since then would otherwise surface
      // only later, as a failed create_jar with no context.
      const jar = await readJar(jarIdForSlug(slug));
      if (jar && jar.owner !== publicKey) {
        setAvailable(false);
        setOnChain(true);
        return;
      }
      await creatorApi.claim(jwt, { slug, jarId: `@${slug}` });
      onNext(slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim slug.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => { e.preventDefault(); handleClaim(); }}
    >
      <div>
        <h2 className="text-xl font-bold text-fg mb-1">Claim your slug</h2>
        <p className="text-sm text-fg-subtle">
          Your tip page will live at{" "}
          <span className="text-accent font-mono">
            {getTipUrl(slug || "you").replace(/^https?:\/\//, "")}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-faint text-sm pointer-events-none">
            @
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
            placeholder="yourname"
            maxLength={32}
            disabled={saving}
            className="w-full rounded-xl bg-surface-strong border border-hairline pl-8 pr-4 py-3
                       text-fg text-sm placeholder:text-fg-dim focus:outline-none
                       focus:ring-2 focus:ring-brand-500/50 transition-all disabled:opacity-50"
            aria-label="Choose your slug"
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-fg-faint">3–32 chars: lowercase, numbers, hyphens, underscores</p>
          {slugValid && (
            checking
              ? <Badge variant="default">Checking…</Badge>
              : available === true
              ? <Badge variant="success">Available ✓</Badge>
              : available === false
              ? <Badge variant="error">{onChain ? "Taken on-chain" : "Taken"}</Badge>
              : null
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!slugValid || checking || !available || saving}
        loading={saving}
      >
        Claim @{slug || "…"}
      </Button>
    </form>
  );
}
