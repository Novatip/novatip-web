"use client";

/**
 * components/settings/SlugRenameCard.tsx
 *
 * Slug rename flow with availability check and warning acknowledgement.
 * Owns its own state, accepts the loaded creator as a prop.
 */

import { useState, useEffect } from "react";
import type { CreatorProfile } from "@/lib/api";
import { ApiError, creatorApi } from "@/lib/api";
import { isValidSlug } from "@/lib/slug";
import { getTipUrl } from "@/lib/tipUrl";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface SlugRenameCardProps {
  jwt: string;
  creator: CreatorProfile;
  onUpdate: (updated: CreatorProfile) => void;
}

export function SlugRenameCard({ jwt, creator, onUpdate }: SlugRenameCardProps) {
  const [newSlug, setNewSlug] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaved, setRenameSaved] = useState(false);

  const slugValid = isValidSlug(newSlug);
  const isUnchanged = slugValid && newSlug === creator.slug;

  // Debounced availability check
  useEffect(() => {
    if (!slugValid || isUnchanged) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      creatorApi
        .checkSlug(newSlug, { signal: controller.signal })
        .then((r) => setAvailable(r.available))
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.code === "ABORTED") return;
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

  const canRename =
    slugValid && !isUnchanged && available === true && acknowledged && !renaming;

  async function handleRename() {
    if (!canRename) return;
    setRenaming(true);
    setRenameError(null);
    setRenameSaved(false);
    try {
      const result = await creatorApi.updateSlug(jwt, newSlug);
      onUpdate(result.creator);
      setNewSlug("");
      setAcknowledged(false);
      setAvailable(null);
      setRenameSaved(true);
    } catch (e) {
      setRenameError(
        e instanceof ApiError && e.status === 404
          ? "Slug renaming is not available yet."
          : e instanceof Error
            ? e.message
            : "Failed to rename slug.",
      );
    } finally {
      setRenaming(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rename your slug</CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-warning/10 border border-warning/20 px-4 py-3">
          <p className="text-sm text-warning">
            Renaming changes your public link immediately. Your current link (
            <span className="font-mono">{getTipUrl(creator.slug).replace(/^https?:\/\//, "")}</span>
            ) will stop working — including any QR codes or posters that already have it printed on
            them.
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
                setRenameSaved(false);
                setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
              }}
              placeholder={creator.slug}
              maxLength={32}
              disabled={renaming}
              className="w-full rounded-xl bg-surface-strong border border-hairline pl-8 pr-4 py-3
                         text-fg text-sm placeholder:text-fg-dim focus:outline-none
                         focus:ring-2 focus:ring-brand-500/50 transition-all disabled:opacity-50"
              aria-label="New slug"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-fg-faint">3–32 chars: lowercase, numbers, hyphens, underscores</p>
            {slugValid &&
              !isUnchanged &&
              (checking ? (
                <Badge variant="default">Checking…</Badge>
              ) : available === true ? (
                <Badge variant="success">Available ✓</Badge>
              ) : available === false ? (
                <Badge variant="error">Taken</Badge>
              ) : null)}
            {isUnchanged && <Badge variant="default">That&apos;s your current slug</Badge>}
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-fg-subtle">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            disabled={renaming}
            className="mt-0.5"
          />
          I understand my old link will stop working immediately.
        </label>

        {renameError && <p className="text-sm text-danger">{renameError}</p>}
        {renameSaved && <p className="text-sm text-success">Slug renamed successfully!</p>}

        <Button
          size="lg"
          className="w-full"
          disabled={!canRename}
          loading={renaming}
          onClick={handleRename}
        >
          Rename to @{newSlug || "…"}
        </Button>
      </div>
    </Card>
  );
}
