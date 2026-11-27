"use client";

/**
 * components/settings/ProfileForm.tsx
 *
 * Profile editing form — displayName, bio, avatar URL, and notification email.
 * Owns its own form state and validation, accepts the loaded creator as a prop.
 */

import { useState, useEffect, useRef } from "react";
import type { CreatorProfile } from "@/lib/api";
import { creatorApi } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/Avatar";

// ── Validation ────────────────────────────────────────────────────────────────

const DISPLAY_NAME_MAX = 80;
const BIO_MAX = 300;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVATAR_PREVIEW_DEBOUNCE_MS = 500;

function validateDisplayName(value: string): string | undefined {
  if (value.length > DISPLAY_NAME_MAX)
    return `Display name must be ${DISPLAY_NAME_MAX} characters or fewer`;
  return undefined;
}

function validateBio(value: string): string | undefined {
  if (value.length > BIO_MAX) return `Bio must be ${BIO_MAX} characters or fewer`;
  return undefined;
}

function validateEmail(value: string): string | undefined {
  if (!value) return undefined; // optional; clearing turns notifications off
  if (!EMAIL_PATTERN.test(value)) return "Must be a valid email address";
  return undefined;
}

function validateAvatarUrl(value: string): string | undefined {
  if (!value) return undefined; // optional field
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "Avatar URL must start with https://";
    return undefined;
  } catch {
    return "Must be a valid URL";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ProfileFormProps {
  jwt: string;
  creator: CreatorProfile;
  onUpdate: (updated: CreatorProfile) => void;
}

export function ProfileForm({ jwt, creator, onUpdate }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(creator.displayName ?? "");
  const [bio, setBio] = useState(creator.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(creator.avatarUrl ?? "");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(creator.avatarUrl ?? "");
  const [email, setEmail] = useState(creator.email ?? "");
  const [touched, setTouched] = useState({
    displayName: false,
    bio: false,
    avatarUrl: false,
    email: false,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Fill the form once the profile arrives, keyed on creator.id so a later save
  // which replaces the creator prop doesn't overwrite unsaved edits.
  const populatedFor = useRef<string | null>(creator.id);
  useEffect(() => {
    if (populatedFor.current === creator.id) return;
    populatedFor.current = creator.id;
    setDisplayName(creator.displayName ?? "");
    setBio(creator.bio ?? "");
    setAvatarUrl(creator.avatarUrl ?? "");
    setAvatarPreviewUrl(creator.avatarUrl ?? "");
    setEmail(creator.email ?? "");
  }, [creator]);

  // ── Debounce avatar preview ────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setAvatarPreviewUrl(avatarUrl);
    }, AVATAR_PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [avatarUrl]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const profileErrors = {
    displayName: touched.displayName ? validateDisplayName(displayName) : undefined,
    bio: touched.bio ? validateBio(bio) : undefined,
    avatarUrl: touched.avatarUrl ? validateAvatarUrl(avatarUrl) : undefined,
    email: touched.email ? validateEmail(email) : undefined,
  };

  const profileHasErrors =
    !!validateDisplayName(displayName) ||
    !!validateBio(bio) ||
    !!validateAvatarUrl(avatarUrl) ||
    !!validateEmail(email);

  const profileDirty =
    displayName !== (creator.displayName ?? "") ||
    bio !== (creator.bio ?? "") ||
    avatarUrl !== (creator.avatarUrl ?? "") ||
    email !== (creator.email ?? "");

  function touchProfileField(field: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  // ── Warn before leaving with unsaved changes ───────────────────────────────
  useEffect(() => {
    if (!profileDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the custom message and show their own generic one
      return (e.returnValue = "");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [profileDirty]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ displayName: true, bio: true, avatarUrl: true, email: true });
    if (profileSaving || profileHasErrors) return;

    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      // Send null for cleared fields so they are explicitly removed on the backend.
      // Empty string for displayName/bio means "clear this field".
      // Email is different: null means "turn notifications off".
      const r = await creatorApi.updateProfile(jwt, {
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        email: email.trim() || null,
      });
      onUpdate(r.creator);
      setDisplayName(r.creator.displayName ?? "");
      setBio(r.creator.bio ?? "");
      setAvatarUrl(r.creator.avatarUrl ?? "");
      setAvatarPreviewUrl(r.creator.avatarUrl ?? "");
      setEmail(r.creator.email ?? "");
      setProfileSaved(true);
      setTouched({ displayName: false, bio: false, avatarUrl: false, email: false });
    } catch (e: unknown) {
      setProfileError(e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  // Avatar preview
  const finalAvatarPreviewUrl =
    avatarPreviewUrl && !validateAvatarUrl(avatarPreviewUrl)
      ? avatarPreviewUrl
      : creator.avatarUrl ?? null;

  return (
    <form onSubmit={handleProfileSave} noValidate>
      <Card glass={false}>
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
        </CardHeader>

        <div className="flex flex-col gap-5">
          {/* Avatar preview + URL */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-brand-500/20">
                <Avatar
                  src={finalAvatarPreviewUrl}
                  displayName={displayName || creator.displayName || creator.slug}
                  slug={creator.slug}
                />
              </div>
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
                onBlur={() => {
                  touchProfileField("avatarUrl");
                  setAvatarPreviewUrl(avatarUrl);
                }}
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
            <label htmlFor="profile-bio" className="text-sm font-medium text-fg-muted">
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
                profileErrors.bio ? "border-danger/50 focus:ring-danger/30" : "border-hairline",
              ].join(" ")}
              aria-describedby={profileErrors.bio ? "bio-error" : "bio-hint"}
            />
            {profileErrors.bio ? (
              <p id="bio-error" className="text-xs text-danger">
                {profileErrors.bio}
              </p>
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
                  setDisplayName(creator.displayName ?? "");
                  setBio(creator.bio ?? "");
                  setAvatarUrl(creator.avatarUrl ?? "");
                  setAvatarPreviewUrl(creator.avatarUrl ?? "");
                  setEmail(creator.email ?? "");
                  setTouched({
                    displayName: false,
                    bio: false,
                    avatarUrl: false,
                    email: false,
                  });
                  setProfileError(null);
                }}
              >
                Discard
              </button>
            )}
          </div>
        </div>
      </Card>
    </form>
  );
}
