"use client";

/**
 * NotificationPreferences.tsx
 *
 * Lets a creator choose which notification channels fire after each tip.
 *
 * Two channels exist today:
 *   - Email  — the backend sends a message to the address on the creator's
 *              account after every indexed tip.
 *   - Webhook — the backend POSTs a JSON payload to the URL(s) the creator
 *               has registered under /dashboard/webhooks.
 *
 * Each toggle saves immediately on change (optimistic update + server round
 * trip). A persistent error banner is shown if the save fails; the toggle
 * reverts to its previous value so the displayed state matches reality.
 *
 * The "delivering today" note is intentional: it sets honest expectations
 * rather than implying every listed channel is fully operational in all
 * environments.
 */

import { useEffect, useRef, useState } from "react";
import { notificationsApi, type NotificationPreferences as Prefs } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// ── Toggle ────────────────────────────────────────────────────────────────────

interface ToggleProps {
  id:       string;
  checked:  boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  label:    string;
  description: string;
  badge?:   string;
}

function Toggle({ id, checked, disabled, onChange, label, description, badge }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start justify-between gap-4 rounded-xl border px-4 py-3 cursor-pointer transition-colors",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-surface-strong",
        checked ? "border-brand-500/30 bg-brand-500/5" : "border-hairline",
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-2 text-sm font-medium text-fg">
          {label}
          {badge && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-success/15 text-success">
              {badge}
            </span>
          )}
        </span>
        <span className="text-xs text-fg-subtle">{description}</span>
      </div>

      {/* The actual checkbox is visually hidden; the styled div acts as the
          visible indicator. Both are labelled via htmlFor/id above. */}
      <div className="relative shrink-0 mt-0.5" aria-hidden="true">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            "w-10 h-6 rounded-full transition-colors",
            checked ? "bg-brand-500" : "bg-hairline",
            disabled && "opacity-50",
          )}
        />
        <div
          className={cn(
            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4",
          )}
        />
      </div>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface NotificationPreferencesProps {
  jwt: string;
}

export function NotificationPreferences({ jwt }: NotificationPreferencesProps) {
  const [prefs,   setPrefs]   = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    notificationsApi
      .getPreferences(jwt, { signal: controller.signal })
      .then((r) => {
        if (abortControllerRef.current === controller) setPrefs(r.preferences);
      })
      .catch((e: any) => {
        if (e.code === "ABORTED") return;
        setError(e.message ?? "Failed to load notification preferences.");
      })
      .finally(() => {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setLoading(false);
        }
      });

    return () => { abortControllerRef.current?.abort(); };
  }, [jwt]);

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleChange(key: keyof Prefs, next: boolean) {
    if (!prefs || saving) return;

    // Optimistic update
    const previous = prefs;
    setPrefs({ ...prefs, [key]: next });
    setSaving(true);
    setError(null);

    try {
      const r = await notificationsApi.updatePreferences(jwt, { [key]: next });
      setPrefs(r.preferences);
    } catch (e: any) {
      // Revert on failure so displayed state matches server state
      setPrefs(previous);
      setError(e.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-3 px-4 pb-4">

        {/* Honest channel status note */}
        <p className="text-xs text-fg-subtle">
          Choose which channels fire after each tip is indexed.{" "}
          <span className="text-fg-faint">
            Both channels are active today. Turn off any you don&apos;t want.
          </span>
        </p>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2"
          >
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3 animate-pulse" aria-busy="true" aria-label="Loading notification preferences">
            <div className="h-16 rounded-xl bg-hairline" />
            <div className="h-16 rounded-xl bg-hairline" />
          </div>
        )}

        {/* Toggles */}
        {!loading && prefs && (
          <>
            <Toggle
              id="notif-email"
              label="Email"
              description="Receive an email for every tip received."
              badge="delivering"
              checked={prefs.emailEnabled}
              disabled={saving}
              onChange={(v) => handleChange("emailEnabled", v)}
            />

            <Toggle
              id="notif-webhook"
              label="Webhook"
              description="POST a JSON payload to your registered webhook URL(s) after each tip."
              badge="delivering"
              checked={prefs.webhookEnabled}
              disabled={saving}
              onChange={(v) => handleChange("webhookEnabled", v)}
            />
          </>
        )}

        {/* Empty state — preferences endpoint returned nothing */}
        {!loading && !prefs && !error && (
          <p className="text-sm text-fg-faint">
            No notification settings found. Complete onboarding first.
          </p>
        )}

      </div>
    </Card>
  );
}
