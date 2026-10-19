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
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { CopyFallback } from "@/components/CopyFallback";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface Webhook {
  id: string;
  url: string;
  enabled: boolean;
}

interface RevealedSecret {
  webhookId: string;
  secret: string;
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const u = new URL(trimmed);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function WebhooksPage() {
  const { jwt } = useWallet();

  // ── List state ─────────────────────────────────────────────────────────────
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Add form state ─────────────────────────────────────────────────────────
  const [url, setUrl] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [urlTouched, setUrlTouched] = useState(false);

  // ── Secret reveal state (shown once after creation) ────────────────────────
  const [newSecret, setNewSecret] = useState<RevealedSecret | null>(null);
  const {
    copied,
    failed: copyFailed,
    copy,
    reset: resetCopy,
  } = useCopyToClipboard();

  // ── Remove state ───────────────────────────────────────────────────────────
  const [removing, setRemoving] = useState<string | null>(null); // id being deleted
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});

  const abortRef = useRef<AbortController | null>(null);

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

  // ── Add webhook ────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!jwt || !isValidHttpsUrl(trimmedUrl) || addLoading) return;

    setAddLoading(true);
    setAddError(null);
    setNewSecret(null);
    resetCopy();

    try {
      const r = await webhookApi.create(jwt, trimmedUrl);
      setWebhooks((prev) => [
        ...prev,
        { id: r.webhook.id, url: r.webhook.url, enabled: true },
      ]);
      setNewSecret({ webhookId: r.webhook.id, secret: r.webhook.secret });
      setUrl("");
      setUrlTouched(false);
    } catch (e: unknown) {
      setAddError(getErrorMessage(e, "Failed to register webhook."));
    } finally {
      setAddLoading(false);
    }
  }

  // ── Remove webhook ─────────────────────────────────────────────────────────
  async function handleRemove(id: string) {
    if (!jwt || removing) return;

    setRemoving(id);
    setRemoveErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      await webhookApi.remove(jwt, id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      // Dismiss any revealed secret only if the removed webhook matches and only after successful removal
      setNewSecret((current) => (current?.webhookId === id ? null : current));
    } catch (e: unknown) {
      setRemoveErrors((prev) => ({
        ...prev,
        [id]: getErrorMessage(e, "Failed to remove webhook."),
      }));
    } finally {
      setRemoving(null);
    }
  }

  // ── Copy secret ────────────────────────────────────────────────────────────
  async function handleCopySecret() {
    if (!newSecret) return;
    await copy(newSecret.secret);
  }

  const urlError =
    urlTouched && url.trim() && !isValidHttpsUrl(url)
      ? "Must be a valid HTTPS URL"
      : undefined;

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
        <ErrorPanel
          message={listError}
          onRetry={fetchWebhooks}
          retrying={listLoading}
        />
      )}

      {/* One-time secret banner */}
      {newSecret && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <span
              className="text-warning text-lg leading-none mt-0.5"
              aria-hidden="true"
            >
              ⚠
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-warning">
                Save your signing secret — it will not be shown again
              </p>
              <p className="text-xs text-fg-subtle">
                Use this value to verify the{" "}
                <code className="text-accent">X-Novatip-Signature</code> header
                on incoming requests.
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
            <CopyFallback
              text={newSecret.secret}
              onDismiss={resetCopy}
              noun="secret"
            />
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
      <Card glass={false}>
        <CardHeader>
          <CardTitle level={2}>Add endpoint</CardTitle>
        </CardHeader>
        <form onSubmit={handleAdd} className="flex flex-col gap-4" noValidate>
          <Input
            label="Endpoint URL"
            type="url"
            placeholder="https://your-server.example.com/webhooks/novatip"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setUrlTouched(true)}
            error={urlError}
            hint="Must be an HTTPS URL. We send a signed JSON body on every successful tip."
            disabled={addLoading}
            autoComplete="off"
          />

          {addError && <p className="text-sm text-danger">{addError}</p>}

          <Button
            type="submit"
            size="md"
            className="self-start"
            loading={addLoading}
            disabled={addLoading || !isValidHttpsUrl(url)}
          >
            {addLoading ? "Registering…" : "Add webhook"}
          </Button>
        </form>
      </Card>

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
            No webhooks yet. Add an endpoint above to start receiving tip
            notifications.
          </p>
        )}

        {!listLoading && webhooks.length > 0 && (
          <ul
            className="flex flex-col divide-y divide-hairline"
            aria-label="Registered webhooks"
          >
            {webhooks.map((wh) => (
              <li
                key={wh.id}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-fg truncate">
                      {wh.url}
                    </p>
                  </div>
                  <Badge variant={wh.enabled ? "success" : "default"}>
                    {wh.enabled ? "active" : "disabled"}
                  </Badge>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={removing === wh.id}
                    disabled={!!removing}
                    onClick={() => handleRemove(wh.id)}
                    aria-label={`Remove webhook ${wh.url}`}
                  >
                    {removing === wh.id ? "Removing…" : "Remove"}
                  </Button>
                </div>
                {removeErrors[wh.id] && (
                  <p className="text-xs text-danger">{removeErrors[wh.id]}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
