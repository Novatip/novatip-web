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
 * - Surfaces API failures as readable inline errors.
 */

import { useEffect, useState, useRef } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { ApiError, getErrorMessage, webhookApi, type WebhookDelivery } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface Webhook {
  id:      string;
  url:     string;
  enabled: boolean;
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function WebhooksPage() {
  const { jwt } = useWallet();

  // ── List state ─────────────────────────────────────────────────────────────
  const [webhooks,     setWebhooks]     = useState<Webhook[]>([]);
  const [listLoading,  setListLoading]  = useState(true);
  const [listError,    setListError]    = useState<string | null>(null);

  // ── Add form state ─────────────────────────────────────────────────────────
  const [url,          setUrl]          = useState("");
  const [addLoading,   setAddLoading]   = useState(false);
  const [addError,     setAddError]     = useState<string | null>(null);
  const [urlTouched,   setUrlTouched]   = useState(false);

  // ── Secret reveal state (shown once after creation) ────────────────────────
  const [newSecret,    setNewSecret]    = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [secretContext, setSecretContext] = useState<"created" | "rotated">("created");

  // ── Remove state ───────────────────────────────────────────────────────────
  const [removing,     setRemoving]     = useState<string | null>(null); // id being deleted
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; url: string } | null>(null);

  // ── Deliveries state ───────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});
  const [deliveriesLoading, setDeliveriesLoading] = useState<Record<string, boolean>>({});
  const [deliveriesError, setDeliveriesError] = useState<Record<string, string>>({});

  // ── Rotate secret state ────────────────────────────────────────────────────
  const [confirmRotate, setConfirmRotate] = useState<{ id: string; url: string } | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);
  const [rotateErrors, setRotateErrors] = useState<Record<string, string>>({});

  // ── Toggle enabled state ───────────────────────────────────────────────────
  const [toggling, setToggling] = useState<string | null>(null);
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  useEffect(() => {
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

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [jwt]);

  // ── Add webhook ────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!jwt || !isValidHttpsUrl(url) || addLoading) return;

    setAddLoading(true);
    setAddError(null);
    setNewSecret(null);

    try {
      const r = await webhookApi.create(jwt, url);
      setWebhooks((prev) => [
        ...prev,
        { id: r.webhook.id, url: r.webhook.url, enabled: true },
      ]);
      setNewSecret(r.webhook.secret);
      setSecretContext("created");
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
    setConfirmRemove(null);
    // Dismiss any revealed secret when the corresponding webhook is removed
    if (newSecret && webhooks.find((w) => w.id === id)) {
      setNewSecret(null);
    }

    try {
      await webhookApi.remove(jwt, id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (e: unknown) {
      setRemoveErrors((prev) => ({
        ...prev,
        [id]: getErrorMessage(e, "Failed to remove webhook."),
      }));
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

  // ── Toggle deliveries ──────────────────────────────────────────────────────
  async function toggleDeliveries(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    // Fetch deliveries if not already loaded
    if (!deliveries[id] && !deliveriesLoading[id] && jwt) {
      setDeliveriesLoading((prev) => ({ ...prev, [id]: true }));
      setDeliveriesError((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      try {
        const r = await webhookApi.deliveries(jwt, id);
        setDeliveries((prev) => ({ ...prev, [id]: r.deliveries }));
      } catch (e: unknown) {
        setDeliveriesError((prev) => ({
          ...prev,
          [id]: getErrorMessage(e, "Failed to load deliveries."),
        }));
      } finally {
        setDeliveriesLoading((prev) => ({ ...prev, [id]: false }));
      }
    }
  }

  function formatDeliveryTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
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
    setRotateErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setConfirmRotate(null);

    try {
      const r = await webhookApi.rotateSecret(jwt, id);
      setNewSecret(r.secret);
      setSecretContext("rotated");
    } catch (e: unknown) {
      setRotateErrors((prev) => ({
        ...prev,
        [id]: getErrorMessage(e, "Failed to rotate secret."),
      }));
    } finally {
      setRotating(null);
    }
  }

  // ── Toggle enabled ─────────────────────────────────────────────────────────
  async function handleToggle(id: string, currentEnabled: boolean) {
    if (!jwt || toggling) return;

    setToggling(id);
    setToggleErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      await webhookApi.update(jwt, id, { enabled: !currentEnabled });
      setWebhooks((prev) =>
        prev.map((w) => (w.id === id ? { ...w, enabled: !currentEnabled } : w)),
      );
    } catch (e: unknown) {
      setToggleErrors((prev) => ({
        ...prev,
        [id]: getErrorMessage(e, "Failed to update webhook."),
      }));
    } finally {
      setToggling(null);
    }
  }

  // ── Copy secret ────────────────────────────────────────────────────────────
  async function handleCopySecret() {
    if (!newSecret) return;
    try {
      await navigator.clipboard.writeText(newSecret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable; the user can still select manually
    }
  }

  const urlError =
    urlTouched && url && !isValidHttpsUrl(url)
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
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
          <p className="text-sm text-danger">{listError}</p>
        </div>
      )}

      {/* One-time secret banner */}
      {newSecret && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <span className="text-warning text-lg leading-none mt-0.5" aria-hidden="true">⚠</span>
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
                Use this value to verify the <code className="text-accent">X-Novatip-Signature</code> header on incoming requests.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-surface-strong border border-hairline px-3 py-2 text-xs font-mono text-fg select-all">
              {newSecret}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopySecret}
              className="shrink-0"
              aria-label="Copy signing secret"
            >
              {secretCopied ? "Copied ✓" : "Copy"}
            </Button>
          </div>
          <button
            type="button"
            className="self-end text-xs text-fg-faint hover:text-fg transition-colors"
            onClick={() => setNewSecret(null)}
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

          {addError && (
            <p className="text-sm text-danger">{addError}</p>
          )}

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
            No webhooks yet. Add an endpoint above to start receiving tip notifications.
          </p>
        )}

        {!listLoading && webhooks.length > 0 && (
          <ul className="flex flex-col divide-y divide-hairline" aria-label="Registered webhooks">
            {webhooks.map((wh) => (
              <li key={wh.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDeliveries(wh.id)}
                    className="shrink-0 text-fg-subtle hover:text-fg transition-colors"
                    aria-label={expandedId === wh.id ? "Hide deliveries" : "Show deliveries"}
                    aria-expanded={expandedId === wh.id}
                  >
                    <span className={`transition-transform ${expandedId === wh.id ? "rotate-90" : ""}`}>
                      ▶
                    </span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-fg truncate">{wh.url}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(wh.id, wh.enabled)}
                    disabled={toggling === wh.id || !!rotating || !!removing}
                    className="shrink-0 group"
                    aria-label={wh.enabled ? "Disable webhook" : "Enable webhook"}
                  >
                    <Badge
                      variant={wh.enabled ? "success" : "default"}
                      className="cursor-pointer group-hover:opacity-80 transition-opacity"
                    >
                      {toggling === wh.id ? "..." : wh.enabled ? "active" : "disabled"}
                    </Badge>
                  </button>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={rotating === wh.id}
                    disabled={!!rotating || !!removing || !!toggling}
                    onClick={() => requestRotate(wh.id, wh.url)}
                    aria-label={`Rotate secret for ${wh.url}`}
                  >
                    {rotating === wh.id ? "Rotating…" : "Rotate secret"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={removing === wh.id}
                    disabled={!!removing || !!rotating || !!toggling}
                    onClick={() => requestRemove(wh.id, wh.url)}
                    aria-label={`Remove webhook ${wh.url}`}
                  >
                    {removing === wh.id ? "Removing…" : "Remove"}
                  </Button>
                </div>
                {removeErrors[wh.id] && (
                  <p className="text-xs text-danger ml-8">{removeErrors[wh.id]}</p>
                )}
                {rotateErrors[wh.id] && (
                  <p className="text-xs text-danger ml-8">{rotateErrors[wh.id]}</p>
                )}
                {toggleErrors[wh.id] && (
                  <p className="text-xs text-danger ml-8">{toggleErrors[wh.id]}</p>
                )}

                {/* Deliveries section */}
                {expandedId === wh.id && (
                  <div className="ml-8 mt-2 rounded-lg bg-surface-strong border border-hairline p-3">
                    <h3 className="text-xs font-semibold text-fg mb-2">Recent deliveries</h3>

                    {deliveriesLoading[wh.id] && (
                      <div className="flex items-center gap-2 text-xs text-fg-faint py-2">
                        <span className="animate-spin">⏳</span>
                        Loading…
                      </div>
                    )}

                    {deliveriesError[wh.id] && (
                      <p className="text-xs text-danger py-2">{deliveriesError[wh.id]}</p>
                    )}

                    {!deliveriesLoading[wh.id] && !deliveriesError[wh.id] && deliveries[wh.id] && (
                      <>
                        {deliveries[wh.id].length === 0 ? (
                          <p className="text-xs text-fg-faint py-2">
                            No deliveries yet. This endpoint will receive a POST when a tip lands.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {deliveries[wh.id].map((d) => (
                              <li key={d.id} className="flex items-center gap-3 text-xs">
                                <Badge
                                  variant={d.status >= 200 && d.status < 300 ? "success" : "error"}
                                  className="shrink-0"
                                >
                                  {d.status}
                                </Badge>
                                <span className="text-fg-subtle">
                                  {d.status >= 200 && d.status < 300 ? "✓" : "✗"}
                                </span>
                                <span className="text-fg-faint">
                                  {formatDeliveryTime(d.createdAt)}
                                </span>
                                {d.attempt > 1 && (
                                  <span className="text-fg-faint text-xs">
                                    (attempt {d.attempt})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
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
              This will delete the endpoint and its signing secret immediately.
              There is no undo.
            </p>
            <div className="rounded-lg bg-surface-strong border border-hairline px-3 py-2 mb-6">
              <p className="text-xs font-mono text-fg break-all">{confirmRemove.url}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={cancelRemove}
                autoFocus
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => handleRemove(confirmRemove.id)}
              >
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
              This will generate a new secret and invalidate the old one immediately.
              Update your endpoint to use the new secret before rotating.
            </p>
            <div className="rounded-lg bg-surface-strong border border-hairline px-3 py-2 mb-6">
              <p className="text-xs font-mono text-fg break-all">{confirmRotate.url}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={cancelRotate}
                autoFocus
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleRotate(confirmRotate.id)}
              >
                Rotate secret
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
