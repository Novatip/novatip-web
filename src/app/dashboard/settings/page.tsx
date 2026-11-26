"use client";

/**
 * app/dashboard/settings/page.tsx
 *
 * Profile settings — edit display name, bio and avatar URL, and rename the
 * creator's public slug.
 *
 * The page loads the creator once from the shared context and passes it to two
 * sub-components: ProfileForm and SlugRenameCard. Each owns its own state.
 */

import { useWallet } from "@/contexts/WalletContext";
import { useCreator } from "@/contexts/CreatorContext";
import { getTipUrl } from "@/lib/tipUrl";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { SlugRenameCard } from "@/components/settings/SlugRenameCard";

export default function SettingsPage() {
  const { jwt } = useWallet();
  const { creator, loading, error: loadError, setCreator } = useCreator();

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">Settings</h1>
        <p className="text-sm text-fg-subtle mt-1">Manage your public profile and tip page link.</p>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
          <p className="text-sm text-danger">{loadError}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Card glass={false}>
          <CardHeader>
            <CardTitle>Public profile</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-hairline shrink-0" />
              <div className="flex-1 h-10 rounded-xl bg-hairline" />
            </div>
            <div className="h-10 rounded-xl bg-hairline" />
            <div className="h-24 rounded-xl bg-hairline" />
          </div>
        </Card>
      )}

      {/* Profile form */}
      {!loading && jwt && creator && (
        <ProfileForm jwt={jwt} creator={creator} onUpdate={setCreator} />
      )}

      {/* Notification preferences */}
      {jwt && creator && <NotificationPreferences jwt={jwt} />}

      {/* Public link */}
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

      {/* Slug rename */}
      {!loading && jwt && creator && (
        <SlugRenameCard jwt={jwt} creator={creator} onUpdate={setCreator} />
      )}
    </div>
  );
}
