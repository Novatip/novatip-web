"use client";

/**
 * app/dashboard/settings/page.tsx
 *
 * Profile settings — edit display name, bio and avatar URL.
 * Saves via PATCH /creators/me (creatorApi.updateProfile).
 *
 * Validation mirrors the limits the backend enforces so errors surface
 * inline before the network round trip rather than after.
 */

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { creatorApi, authApi, type CreatorProfile } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// ── Validation ────────────────────────────────────────────────────────────────

const DISPLAY_NAME_MAX = 50;
const BIO_MAX          = 300;

function validateDisplayName(v: string): string | undefined {
  if (v.length > DISPLAY_NAME_MAX)
    return `Display name must be ${DISPLAY_NAME_MAX} characters or fewer`;
  return undefined;
}

function validateBio(v: string): string | undefined {
  if (v.length > BIO_MAX)
    return `Bio must be ${BIO_MAX} characters or fewer`;
  return undefined;
}

function validateAvatarUrl(v: string): string | undefined {
  if (!v) return undefined; // optional field
  try {
    const u = new URL(v);
    if (u.protocol !== "https:")
      return "Avatar URL must start with https://";
    return undefined;
  } catch {
    return "Must be a valid URL";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { jwt } = useWallet();

  // ── Load current profile ───────────────────────────────────────────────────
  const [profile,     setProfile]     = useState<CreatorProfile | null>(null);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [loadLoading, setLoadLoading] = useState(true);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [bio,         setBio]         = useState("");
  const [avatarUrl,   setAvatarUrl]   = useState("");

  // Track which fields have been blurred so errors only appear after interaction
  const [touched, setTouched] = useState({
    displayName: false,
    bio:         false,
    avatarUrl:   false,
  });

  // ── Save state ─────────────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jwt) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadLoading(true);
    authApi
      .me(jwt, { signal: controller.signal })
      .then((r) =>
        creatorApi.getBySlug(r.user.slug, { signal: controller.signal }),
      )
      .then((r) => {
        const c = r.creator;
        setProfile(c);
        setDisplayName(c.displayName ?? "");
        setBio(c.bio ?? "");
        setAvatarUrl(c.avatarUrl ?? "");
        setLoadError(null);
      })
      .catch((e: any) => {
        if (e.code === "ABORTED") return;
        setLoadError(e.message ?? "Failed to load profile.");
      })
      .finally(() => {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoadLoading(false);
        }
      });

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [jwt]);

  // ── Derived validation ─────────────────────────────────────────────────────
  const errors = {
    displayName: touched.displayName ? validateDisplayName(displayName) : undefined,
    bio:         touched.bio         ? validateBio(bio)                 : undefined,
    avatarUrl:   touched.avatarUrl   ? validateAvatarUrl(avatarUrl)     : undefined,
  };

  // Pre-validate even without touch for the submit button disability check
  const hasErrors =
    !!validateDisplayName(displayName) ||
    !!validateBio(bio) ||
    !!validateAvatarUrl(avatarUrl);

  // Detect whether the form is dirty relative to what was loaded
  const isDirty =
    profile !== null && (
      displayName !== (profile.displayName ?? "") ||
      bio         !== (profile.bio ?? "")         ||
      avatarUrl   !== (profile.avatarUrl ?? "")
    );

  function touch(field: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!jwt || saving || hasErrors) return;

    // Touch all fields to show any remaining errors
    setTouched({ displayName: true, bio: true, avatarUrl: true });
    if (hasErrors) return;

    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      const r = await creatorApi.updateProfile(jwt, {
        displayName: displayName.trim() || undefined,
        bio:         bio.trim()         || undefined,
        avatarUrl:   avatarUrl.trim()   || undefined,
      });
      setProfile(r.creator);
      setDisplayName(r.creator.displayName ?? "");
      setBio(r.creator.bio ?? "");
      setAvatarUrl(r.creator.avatarUrl ?? "");
      setSaved(true);
      // Reset touched so the success state is clean
      setTouched({ displayName: false, bio: false, avatarUrl: false });
      // Dismiss success message after 4 s
      setTimeout(() => setSaved(false), 4000);
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  // ── Avatar preview ─────────────────────────────────────────────────────────
  const avatarPreviewUrl =
    avatarUrl && !validateAvatarUrl(avatarUrl)
      ? avatarUrl
      : profile?.avatarUrl ??
        (profile
          ? `https://api.dicebear.com/8.x/identicon/svg?seed=${profile.slug}`
          : null);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">Profile settings</h1>
        <p className="text-sm text-fg-subtle mt-1">
          Changes appear on your public tip page immediately after saving.
        </p>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
          <p className="text-sm text-danger">{loadError}</p>
        </div>
      )}

      <form onSubmit={handleSave} noValidate>
        <Card glass={false}>
          <CardHeader>
            <CardTitle>Public profile</CardTitle>
          </CardHeader>

          {loadLoading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              {/* Avatar skeleton */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-hairline shrink-0" />
                <div className="flex-1 h-10 rounded-xl bg-hairline" />
              </div>
              <div className="h-10 rounded-xl bg-hairline" />
              <div className="h-24 rounded-xl bg-hairline" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">

              {/* Avatar preview + URL */}
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  {avatarPreviewUrl ? (
                    <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-brand-500/20">
                      <Image
                        src={avatarPreviewUrl}
                        alt="Avatar preview"
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-surface-strong border border-hairline flex items-center justify-center">
                      <span className="text-2xl text-fg-dim" aria-hidden="true">👤</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    label="Avatar URL"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setSaved(false);
                    }}
                    onBlur={() => touch("avatarUrl")}
                    error={errors.avatarUrl}
                    hint="Must be an https:// URL. Leave blank to use the default identicon."
                    disabled={saving}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Display name */}
              <div>
                <Input
                  label="Display name"
                  type="text"
                  placeholder="Your name or handle"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setSaved(false);
                  }}
                  onBlur={() => touch("displayName")}
                  error={errors.displayName}
                  disabled={saving}
                  autoComplete="off"
                />
                <p className="text-xs text-fg-faint mt-1 text-right">
                  {displayName.length} / {DISPLAY_NAME_MAX}
                </p>
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="profile-bio"
                  className="text-sm font-medium text-fg-muted"
                >
                  Bio
                </label>
                <textarea
                  id="profile-bio"
                  rows={4}
                  placeholder="Tell supporters a bit about yourself…"
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value);
                    setSaved(false);
                  }}
                  onBlur={() => touch("bio")}
                  disabled={saving}
                  className={[
                    "w-full rounded-xl bg-surface-strong border px-4 py-2.5",
                    "text-fg placeholder:text-fg-dim text-sm resize-none",
                    "focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50",
                    "transition-all duration-200 disabled:opacity-50",
                    errors.bio
                      ? "border-danger/50 focus:ring-danger/30"
                      : "border-hairline",
                  ].join(" ")}
                  aria-describedby={errors.bio ? "bio-error" : "bio-hint"}
                />
                {errors.bio ? (
                  <p id="bio-error" className="text-xs text-danger">{errors.bio}</p>
                ) : (
                  <p id="bio-hint" className="text-xs text-fg-faint text-right">
                    {bio.length} / {BIO_MAX}
                  </p>
                )}
              </div>

              {/* Save error */}
              {saveError && (
                <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
                  <p className="text-sm text-danger">{saveError}</p>
                </div>
              )}

              {/* Success */}
              {saved && (
                <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-3">
                  <p className="text-sm text-success">
                    Profile saved — your tip page reflects the changes.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="submit"
                  size="md"
                  loading={saving}
                  disabled={saving || hasErrors || !isDirty}
                  aria-label="Save profile changes"
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                {isDirty && !saving && (
                  <button
                    type="button"
                    className="text-sm text-fg-faint hover:text-fg transition-colors"
                    onClick={() => {
                      if (!profile) return;
                      setDisplayName(profile.displayName ?? "");
                      setBio(profile.bio ?? "");
                      setAvatarUrl(profile.avatarUrl ?? "");
                      setTouched({ displayName: false, bio: false, avatarUrl: false });
                      setSaveError(null);
                    }}
                  >
                    Discard
                  </button>
                )}
              </div>

            </div>
          )}
        </Card>
      </form>

      {/* Public link hint */}
      {profile && (
        <p className="text-xs text-fg-faint">
          Your public tip page:{" "}
          <a
            href={`/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline font-mono"
          >
            /{profile.slug}
          </a>
        </p>
      )}

    </div>
  );
}
