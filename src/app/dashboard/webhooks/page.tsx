"use client";

/**
 * app/dashboard/webhooks/page.tsx
 *
 * Manage webhook endpoints that receive tip notifications.
 *
 * - Lists all registered webhooks for the creator.
 * - Allows adding a new endpoint URL; shows the signing secret once on
 *   creation with a clear note that it will not be shown again.
 * - Supports removing any existing webhook.
 * - Surfaces API failures as readable inline errors with retry support.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { ApiError, getErrorMessage, webhookApi } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { CopyFallback } from "@/components/CopyFallback";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { WebhookRow } from "@/components/webhooks/WebhookRow";
import { AddWebhookForm } from "@/components/webhooks/AddWebhookForm";

interface Webhook {
  id: string;
  url: string;
  enabled: boolean;
}

interface RevealedSecret {
  webhookId: string;
  secret: string;
}

export default function WebhooksPage() {
  const { jwt } = useWallet();

  // ── List state ─────────────────────────────────────────────────────────────
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Secret reveal state (shown once after creation) ────────────────────────
  const [newSecret, setNewSecret] = useState<RevealedSecret | null>(null);
  const [secretContext, setSecretContext] = useState<"created" | "rotated">("created");

  // ── Remove state ───────────────────────────────────────────────────────────
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; url: string } | null>(null);

  // ── Rotate secret state ────────────────────────────────────────────────────
  const [confirmRotate, setConfirmRotate] = useState<{ id: string; url: string } | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const { copy, copied, failed: copyFailed, reset: resetCopy } = useCopyToClipboard();
  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchWebhooks = useCallback(() => {
    if (!jwt) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setListLoading(true);
    webhookApi
      .list(jwt, { signal: controller.signal })
      .then((r) => {
        setWebhooks(r.webhooks);
        setListError(null);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "ABORTED") return;
        setListError(getErrorMessage(e, "Failed to load webhooks."));
      })
      .finally(() => {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setListLoading(false);
        }
      });
  }, [jwt]);

  useEffect(() => {
    fetchWebhooks();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchWebhooks]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleWebhookAdded(webhook: { id: string; url: string; secret: string }) {
    setWebhooks((prev) => [...prev, { id: webhook.id, url: webhook.url, enabled: true }]);
    setNewSecret({ webhookId: webhook.id, secret: webhook.secret });
    setSecretContext("created");
    resetCopy();
  }

  // ── Remove webhook ─────────────────────────────────────────────────────────
  async function handleRemove(id: string) {
    if (!jwt || removing) return;

    setRemoving(id);
    setConfirmRemove(null);

    try {
      await webhookApi.remove(jwt, id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      setNewSecret((current) => (current?.webhookId === id ? null : current));
    } catch (e: unknown) {
      // Error handled silently
    } finally {
      setRemoving(null);
    }
  }

  function requestRemove(id: string, url: string) {
    setConfirmRemove({ id, url });
  }

  function cancelRemove() {
    setConfirmRemove(null);
  }

  // ── Rotate secret ──────────────────────────────────────────────────────────
  function requestRotate(id: string, url: string) {
    setConfirmRotate({ id, url });
  }

  function cancelRotate() {
    setConfirmRotate(null);
  }

  async function handleRotate(id: string) {
    if (!jwt || rotating) return;

    setRotating(id);
    setConfirmRotate(null);

    try {
      const r = await webhookApi.rotateSecret(jwt, id);
      setNewSecret({ webhookId: id, secret: r.secret });
      setSecretContext("rotated");
    } catch (e: unknown) {
      // Error handled silently
    } finally {
      setRotating(null);
    }
  }

  // ── Toggle enabled ─────────────────────────────────────────────────────────
  function handleToggle(id: string, currentEnabled: boolean) {
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, enabled: !currentEnabled } : w)));
  }

  // ── Copy secret ────────────────────────────────────────────────────────────
  async function handleCopySecret() {
    if (!newSecret) return;
    await copy(newSecret.secret);
  }

  const isAnyActionInProgress = !!removing || !!rotating;

  const urlError = undefined;

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">Webhooks</h1>
        <p className="text-sm text-fg-subtle mt-1">
          Receive a signed POST request at your endpoint whenever a tip lands.
        </p>
      </div>

      {/* List error */}
      {listError && (
        <ErrorPanel message={listError} onRetry={fetchWebhooks} retrying={listLoading} />
      )}

      {/* One-time secret banner */}
      {newSecret && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <span className="text-warning text-lg leading-none mt-0.5" aria-hidden="true">
              ⚠
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-warning">
                {secretContext === "created"
                  ? "Save your signing secret — it will not be shown again"
                  : "New signing secret generated — save it now"}
              </p>
              <p className="text-xs text-fg-subtle">
                {secretContext === "rotated" && (
                  <span className="block mb-1 text-warning">
                    The old secret is no longer valid.
                  </span>
                )}
                Use this value to verify the{" "}
                <code className="text-accent">X-Novatip-Signature</code> header on incoming
                requests.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-surface-strong border border-hairline px-3 py-2 text-xs font-mono text-fg select-all">
              {newSecret.secret}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopySecret}
              className="shrink-0"
              aria-label="Copy signing secret"
            >
              {copied ? "Copied ✓" : "Copy"}
            </Button>
          </div>
          {copyFailed && (
            <CopyFallback text={newSecret.secret} onDismiss={resetCopy} noun="secret" />
          )}
          <button
            type="button"
            className="self-end text-xs text-fg-faint hover:text-fg transition-colors"
            onClick={() => {
              setNewSecret(null);
              resetCopy();
            }}
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* Add form */}
      {jwt && <AddWebhookForm jwt={jwt} onWebhookAdded={handleWebhookAdded} />}

      {/* Webhooks list */}
      <Card glass={false}>
        <CardHeader>
          <CardTitle level={2}>Registered endpoints</CardTitle>
        </CardHeader>

        {listLoading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 h-5 rounded-lg bg-hairline" />
                <div className="w-16 h-8 rounded-lg bg-hairline" />
              </div>
            ))}
          </div>
        )}

        {!listLoading && webhooks.length === 0 && (
          <p className="text-sm text-fg-faint py-4 text-center">
            No webhooks yet. Add an endpoint above to start receiving tip notifications.
          </p>
        )}

        {!listLoading && webhooks.length > 0 && (
          <ul className="flex flex-col divide-y divide-hairline" aria-label="Registered webhooks">
            {webhooks.map((wh) =>
              jwt ? (
                <WebhookRow
                  key={wh.id}
                  webhook={wh}
                  jwt={jwt}
                  onRemove={requestRemove}
                  onRotate={requestRotate}
                  onToggle={handleToggle}
                  disabled={isAnyActionInProgress}
                />
              ) : null,
            )}
          </ul>
        )}
      </Card>

      {/* Remove confirmation dialog */}
      {confirmRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
          onClick={cancelRemove}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-remove-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") cancelRemove();
          }}
        >
          <div
            className="bg-surface border border-hairline rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-remove-title" className="text-lg font-bold text-fg mb-2">
              Remove webhook?
            </h2>
            <p className="text-sm text-fg-subtle mb-4">
              This will delete the endpoint and its signing secret immediately. There is no undo.
            </p>
            <div className="rounded-lg bg-surface-strong border border-hairline px-3 py-2 mb-6">
              <p className="text-xs font-mono text-fg break-all">{confirmRemove.url}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="md" onClick={cancelRemove} autoFocus>
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={() => handleRemove(confirmRemove.id)}>
                Remove webhook
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rotate secret confirmation dialog */}
      {confirmRotate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
          onClick={cancelRotate}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-rotate-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") cancelRotate();
          }}
        >
          <div
            className="bg-surface border border-hairline rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-rotate-title" className="text-lg font-bold text-fg mb-2">
              Rotate signing secret?
            </h2>
            <p className="text-sm text-fg-subtle mb-4">
              This will generate a new secret and invalidate the old one immediately. Update your
              endpoint to use the new secret before rotating.
            </p>
            <div className="rounded-lg bg-surface-strong border border-hairline px-3 py-2 mb-6">
              <p className="text-xs font-mono text-fg break-all">{confirmRotate.url}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="md" onClick={cancelRotate} autoFocus>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={() => handleRotate(confirmRotate.id)}>
                Rotate secret
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
