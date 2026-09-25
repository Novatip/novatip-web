"use client";

/**
 * app/dashboard/settings/page.tsx
 *
 * Dashboard page for renaming the creator's public slug.
 *
 * A slug is chosen once during onboarding and otherwise permanent, but the
 * old link is printed on posters and encoded into QR codes — so a rename has
 * real consequences a creator needs to see *before* it happens, not discover
 * after. The warning and acknowledgement below are load-bearing, not
 * decoration: they're what turns "permanent by omission" into a deliberate
 * choice.
 */

import { useEffect, useState, useRef } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { authApi, creatorApi, type CreatorProfile } from "@/lib/api";
import { getTipUrl } from "@/lib/tipUrl";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function SettingsPage() {
  const { jwt } = useWallet();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newSlug,    setNewSlug]    = useState("");
  const [available,  setAvailable]  = useState<boolean | null>(null);
  const [checking,   setChecking]   = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);
  const [saved,      setSaved]      = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!jwt) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    authApi
      .me(jwt, { signal: controller.signal })
      .then((r) => creatorApi.getBySlug(r.user.slug, { signal: controller.signal }))
      .then((r) => setCreator(r.creator))
      .catch((e: any) => {
        if (e.code === "ABORTED") return;
        setLoadError(e.message);
      })
      .finally(() => {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setLoading(false);
        }
      });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [jwt]);

  const slugValid   = /^[a-z0-9_-]{3,32}$/.test(newSlug);
  const isUnchanged = slugValid && creator !== null && newSlug === creator.slug;

  // Debounced availability check — mirrors onboarding/SlugStep.tsx. Skipped
  // entirely when the typed slug is just the creator's current one: there is
  // nothing to rename, and checking it against itself would misreport as taken.
  useEffect(() => {
    if (!slugValid || isUnchanged) { setAvailable(null); return; }
    setChecking(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      creatorApi
        .checkSlug(newSlug, { signal: controller.signal })
        .then((r) => setAvailable(r.available))
        .catch((e: any) => {
          if (e.code === "ABORTED") return;
          setAvailable(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [newSlug, slugValid, isUnchanged]);

  const canSave =
    !!jwt && !!creator && slugValid && !isUnchanged && available === true &&
    acknowledged && !saving;

  async function handleRename() {
    if (!jwt || !canSave) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const result = await creatorApi.updateSlug(jwt, newSlug);
      setCreator(result.creator);
      setNewSlug("");
      setAcknowledged(false);
      setAvailable(null);
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to rename slug.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-fg">Settings</h1>
        <p className="text-sm text-fg-subtle mt-1">
          Manage your public tip page link.
        </p>
      </div>

      {loadError && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
          <p className="text-sm text-danger">{loadError}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your link</CardTitle>
        </CardHeader>

        {loading ? (
          <div className="h-5 w-48 rounded bg-hairline animate-pulse" />
        ) : creator ? (
          <p className="text-sm text-fg-subtle font-mono">
            {getTipUrl(creator.slug).replace(/^https?:\/\//, "")}
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rename your slug</CardTitle>
        </CardHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-warning/10 border border-warning/20 px-4 py-3">
            <p className="text-sm text-warning">
              Renaming changes your public link immediately. Your current link
              {creator && (
                <>
                  {" "}(<span className="font-mono">{getTipUrl(creator.slug).replace(/^https?:\/\//, "")}</span>)
                </>
              )}
              {" "}will stop working — including any QR codes or posters that
              already have it printed on them.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-faint text-sm pointer-events-none">
                @
              </span>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => {
                  setSaved(false);
                  setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
                }}
                placeholder={creator?.slug ?? "newslug"}
                maxLength={32}
                disabled={saving || loading}
                className="w-full rounded-xl bg-surface-strong border border-hairline pl-8 pr-4 py-3
                           text-fg text-sm placeholder:text-fg-dim focus:outline-none
                           focus:ring-2 focus:ring-brand-500/50 transition-all disabled:opacity-50"
                aria-label="New slug"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-fg-faint">3–32 chars: lowercase, numbers, hyphens, underscores</p>
              {slugValid && !isUnchanged && (
                checking
                  ? <Badge variant="default">Checking…</Badge>
                  : available === true
                  ? <Badge variant="success">Available ✓</Badge>
                  : available === false
                  ? <Badge variant="error">Taken</Badge>
                  : null
              )}
              {isUnchanged && (
                <Badge variant="default">That&apos;s your current slug</Badge>
              )}
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-fg-subtle">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              disabled={saving}
              className="mt-0.5"
            />
            I understand my old link will stop working immediately.
          </label>

          {saveError && <p className="text-sm text-danger">{saveError}</p>}
          {saved && <p className="text-sm text-success">Slug renamed successfully!</p>}

          <Button
            size="lg"
            className="w-full"
            disabled={!canSave}
            loading={saving}
            onClick={handleRename}
          >
            Rename to @{newSlug || "…"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
