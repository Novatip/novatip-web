"use client";

/**
 * app/dashboard/settings/page.tsx
 *
 * Profile settings — edit display name, bio and avatar URL, and rename the
 * creator's public slug.
 *
 * The profile form saves through PATCH /creators/me (creatorApi.updateProfile);
 * the rename card keeps its own guarded flow. They share a single creator
 * fetch and a single piece of creator state, so a profile save and a slug
 * rename cannot render two different versions of the same profile.
 *
 * A slug is chosen once during onboarding and otherwise permanent, but the
 * old link is printed on posters and encoded into QR codes — so a rename has
 * real consequences a creator needs to see *before* it happens, not discover
 * after. The warning and acknowledgement below are load-bearing, not
 * decoration: they're what turns "permanent by omission" into a deliberate
 * choice.
 *
 * Validation mirrors the limits the backend enforces so errors surface inline
 * before the network round trip rather than after.
 */

import { useEffect, useState, useRef } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { ApiError, authApi, creatorApi, type CreatorProfile } from "@/lib/api";
import { getTipUrl } from "@/lib/tipUrl";
import { isValidSlug } from "@/lib/slug";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { Avatar } from "@/components/Avatar";

// ── Validation ────────────────────────────────────────────────────────────────

// Both limits match UpdateProfileBody in novatip-backend's creator routes.
const DISPLAY_NAME_MAX = 80;
const BIO_MAX          = 300;

function validateDisplayName(value: string): string | undefined {
  if (value.length > DISPLAY_NAME_MAX)
    return `Display name must be ${DISPLAY_NAME_MAX} characters or fewer`;
  return undefined;
}

function validateBio(value: string): string | undefined {
  if (value.length > BIO_MAX)
    return `Bio must be ${BIO_MAX} characters or fewer`;
  return undefined;
}

// Simple format check — the backend owns real deliverability validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): string | undefined {
  if (!value) return undefined; // optional; clearing turns notifications off
  if (!EMAIL_PATTERN.test(value)) return "Must be a valid email address";
  return undefined;
}

function validateAvatarUrl(value: string): string | undefined {
  if (!value) return undefined; // optional field
  try {
    const url = new URL(value);
    if (url.protocol !== "https:")
      return "Avatar URL must start with https://";
    return undefined;
  } catch {
    return "Must be a valid URL";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { jwt } = useWallet();

  // ── Loaded creator ─────────────────────────────────────────────────────────
  const [creator,   setCreator]   = useState<CreatorProfile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Profile form state ─────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [bio,         setBio]         = useState("");
  const [avatarUrl,   setAvatarUrl]   = useState("");
  const [email,       setEmail]       = useState("");
  // Track which fields have been blurred so errors only appear after
  // interaction, not the moment the page loads with a long existing value.
  const [touched, setTouched] = useState({
    displayName: false,
    bio:         false,
    avatarUrl:   false,
    email:       false,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError,  setProfileError]  = useState<string | null>(null);
  const [profileSaved,  setProfileSaved]  = useState(false);

  // ── Slug rename state ──────────────────────────────────────────────────────
  const [newSlug,      setNewSlug]      = useState("");
  const [available,    setAvailable]    = useState<boolean | null>(null);
  const [checking,     setChecking]     = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [renaming,     setRenaming]     = useState(false);
  const [renameError,  setRenameError]  = useState<string | null>(null);
  const [renameSaved,  setRenameSaved]  = useState(false);

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
      .then((r) => {
        const loaded = r.creator;
        setCreator(loaded);
        setDisplayName(loaded.displayName ?? "");
        setBio(loaded.bio ?? "");
        setAvatarUrl(loaded.avatarUrl ?? "");
        setEmail(loaded.email ?? "");
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "ABORTED") return;
        setLoadError(e instanceof Error ? e.message : "Failed to load your profile.");
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

  // ── Profile validation ─────────────────────────────────────────────────────

  const profileErrors = {
    displayName: touched.displayName ? validateDisplayName(displayName) : undefined,
    bio:         touched.bio         ? validateBio(bio)                 : undefined,
    avatarUrl:   touched.avatarUrl   ? validateAvatarUrl(avatarUrl)     : undefined,
    email:       touched.email       ? validateEmail(email)             : undefined,
  };

  const profileHasErrors =
    !!validateDisplayName(displayName) ||
    !!validateBio(bio) ||
    !!validateAvatarUrl(avatarUrl) ||
    !!validateEmail(email);

  const profileDirty =
    creator !== null && (
      displayName !== (creator.displayName ?? "") ||
      bio         !== (creator.bio ?? "")         ||
      avatarUrl   !== (creator.avatarUrl ?? "")   ||
      email       !== (creator.email ?? "")
    );

  function touchProfileField(field: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ displayName: true, bio: true, avatarUrl: true, email: true });
    if (!jwt || !creator || profileSaving || profileHasErrors) return;

    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      // Empty fields are omitted rather than sent as "": the backend accepts
      // an empty display name as a value, and the public tip page falls back
      // to @slug only for null, so "" would render a blank heading.
      //
      // Email is different: a blank field is a deliberate "turn notifications
      // off", so it is always sent, as null rather than omitted.
      const r = await creatorApi.updateProfile(jwt, {
        displayName: displayName.trim() || undefined,
        bio:         bio.trim()         || undefined,
        avatarUrl:   avatarUrl.trim()   || undefined,
        email:       email.trim()       || null,
      });
      setCreator(r.creator);
      setDisplayName(r.creator.displayName ?? "");
      setBio(r.creator.bio ?? "");
      setAvatarUrl(r.creator.avatarUrl ?? "");
      setEmail(r.creator.email ?? "");
      setProfileSaved(true);
      setTouched({ displayName: false, bio: false, avatarUrl: false, email: false });
    } catch (e: unknown) {
      setProfileError(e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  // ── Slug rename ────────────────────────────────────────────────────────────

  const slugValid   = isValidSlug(newSlug);
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
    !!jwt && !!creator && slugValid && !isUnchanged && available === true &&
    acknowledged && !renaming;

  async function handleRename() {
    if (!jwt || !canRename) return;
    setRenaming(true);
    setRenameError(null);
    setRenameSaved(false);
    try {
      const result = await creatorApi.updateSlug(jwt, newSlug);
      setCreator(result.creator);
      setNewSlug("");
      setAcknowledged(false);
      setAvailable(null);
      setRenameSaved(true);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "Failed to rename slug.");
    } finally {
      setRenaming(false);
    }
  }

  // ── Avatar preview ─────────────────────────────────────────────────────────
  // No third-party placeholder: Avatar falls back to locally generated
  // initials, so the slug never leaves the app (see Avatar.tsx).
  const avatarPreviewUrl =
    avatarUrl && !validateAvatarUrl(avatarUrl)
      ? avatarUrl
      : creator?.avatarUrl ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">Settings</h1>
        <p className="text-sm text-fg-subtle mt-1">
          Manage your public profile and tip page link.
        </p>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
          <p className="text-sm text-danger">{loadError}</p>
        </div>
      )}

      {/* ── Public profile ─────────────────────────────────────────────────── */}
      <form onSubmit={handleProfileSave} noValidate>
        <Card glass={false}>
          <CardHeader>
            <CardTitle>Public profile</CardTitle>
          </CardHeader>

          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
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
                  {creator ? (
                    <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-brand-500/20">
                      <Avatar
                        src={avatarPreviewUrl}
                        displayName={displayName || creator.displayName || creator.slug}
                        slug={creator.slug}
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
                      setProfileSaved(false);
                    }}
                    onBlur={() => touchProfileField("avatarUrl")}
                    error={profileErrors.avatarUrl}
                    hint="Must be an https:// URL. Leave blank to keep your current avatar."
                    disabled={profileSaving}
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
                    setProfileSaved(false);
                  }}
                  onBlur={() => touchProfileField("displayName")}
                  error={profileErrors.displayName}
                  disabled={profileSaving}
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
                    setProfileSaved(false);
                  }}
                  onBlur={() => touchProfileField("bio")}
                  disabled={profileSaving}
                  className={[
                    "w-full rounded-xl bg-surface-strong border px-4 py-2.5",
                    "text-fg placeholder:text-fg-dim text-sm resize-none",
                    "focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50",
                    "transition-all duration-200 disabled:opacity-50",
                    profileErrors.bio
                      ? "border-danger/50 focus:ring-danger/30"
                      : "border-hairline",
                  ].join(" ")}
                  aria-describedby={profileErrors.bio ? "bio-error" : "bio-hint"}
                />
                {profileErrors.bio ? (
                  <p id="bio-error" className="text-xs text-danger">{profileErrors.bio}</p>
                ) : (
                  <p id="bio-hint" className="text-xs text-fg-faint text-right">
                    {bio.length} / {BIO_MAX}
                  </p>
                )}
              </div>

              {/* Notification email */}
              <div>
                <Input
                  label="Notification email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setProfileSaved(false);
                  }}
                  onBlur={() => touchProfileField("email")}
                  error={profileErrors.email}
                  hint="Get an email on every tip. Leave blank to turn notifications off."
                  disabled={profileSaving}
                  autoComplete="off"
                />
              </div>

              {/* Save error */}
              {profileError && (
                <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
                  <p className="text-sm text-danger">{profileError}</p>
                </div>
              )}

              {/* Success */}
              {profileSaved && (
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
                  loading={profileSaving}
                  disabled={profileSaving || profileHasErrors || !profileDirty}
                  aria-label="Save profile changes"
                >
                  {profileSaving ? "Saving…" : "Save changes"}
                </Button>
                {profileDirty && !profileSaving && (
                  <button
                    type="button"
                    className="text-sm text-fg-faint hover:text-fg transition-colors"
                    onClick={() => {
                      if (!creator) return;
                      setDisplayName(creator.displayName ?? "");
                      setBio(creator.bio ?? "");
                      setAvatarUrl(creator.avatarUrl ?? "");
                      setEmail(creator.email ?? "");
                      setTouched({ displayName: false, bio: false, avatarUrl: false, email: false });
                      setProfileError(null);
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

      {/* ── Notification preferences ───────────────────────────────────────── */}
      {jwt && creator && <NotificationPreferences jwt={jwt} />}

      {/* ── Public link ────────────────────────────────────────────────────── */}
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

      {/* ── Rename slug ────────────────────────────────────────────────────── */}
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
                  setRenameSaved(false);
                  setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
                }}
                placeholder={creator?.slug ?? "newslug"}
                maxLength={32}
                disabled={renaming || loading}
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
    </div>
  );
}
