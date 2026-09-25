"use client";

/**
 * app/dashboard/settings/page.tsx
 *
 * Creator settings — notification preferences.
 */

import { useWallet } from "@/contexts/WalletContext";
import { NotificationPreferences } from "@/components/NotificationPreferences";

export default function SettingsPage() {
  const { jwt } = useWallet();

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-fg">Settings</h1>
        <p className="text-sm text-fg-subtle mt-1">
          Manage how Novatip notifies you about incoming tips.
        </p>
      </div>

      {jwt ? (
        <NotificationPreferences jwt={jwt} />
      ) : (
        <p className="text-sm text-fg-faint">
          Connect your wallet to manage settings.
        </p>
      )}
    </div>
  );
}
