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

interface SlugStepProps {
  jwt:      string;
  onNext:   (slug: string) => void;
}

export function SlugStep({ jwt, onNext }: SlugStepProps) {
  const [slug,      setSlug]      = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking,  setChecking]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const slugValid = /^[a-z0-9_-]{3,32}$/.test(slug);

  // Debounced availability check
  useEffect(() => {
    if (!slugValid) { setAvailable(null); return; }
    setChecking(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      creatorApi
        .checkSlug(slug, { signal: controller.signal })
        .then((r) => setAvailable(r.available))
        .catch((e: any) => {
          if (e.code === "ABORTED") return;
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
  }, [slug, slugValid]);

  async function handleClaim() {
    if (!slugValid || !available) return;
    setSaving(true);
    setError(null);
    try {
      await creatorApi.claim(jwt, { slug, jarId: `@${slug}` });
      onNext(slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim slug.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-fg mb-1">Claim your slug</h2>
        <p className="text-sm text-fg-subtle">
          Your tip page will live at{" "}
          <span className="text-accent font-mono">novatip.xyz/@{slug || "you"}</span>
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
              ? <Badge variant="error">Taken</Badge>
              : null
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        size="lg"
        className="w-full"
        disabled={!slugValid || !available || saving}
        loading={saving}
        onClick={handleClaim}
      >
        Claim @{slug || "…"}
      </Button>
    </div>
  );
}
