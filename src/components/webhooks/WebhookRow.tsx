"use client";

import { useState } from "react";
import { webhookApi, type WebhookDelivery } from "@/lib/api";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/time";
import { TimeAgo } from "@/components/ui/TimeAgo";

interface WebhookRowProps {
  webhook: { id: string; url: string; enabled: boolean };
  jwt: string;
  onRemove: (id: string, url: string) => void;
  onRotate: (id: string, url: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  disabled: boolean;
}

export function WebhookRow({
  webhook,
  jwt,
  onRemove,
  onRotate,
  onToggle,
  disabled,
}: WebhookRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deliveriesError, setDeliveriesError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string } | null>(null);

  async function toggleDeliveries() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    if (deliveries.length === 0 && !deliveriesLoading) {
      setDeliveriesLoading(true);
      setDeliveriesError(null);

      try {
        const r = await webhookApi.deliveries(jwt, webhook.id);
        setDeliveries(r.deliveries);
      } catch (e: unknown) {
        setDeliveriesError(getErrorMessage(e, "Failed to load deliveries."));
      } finally {
        setDeliveriesLoading(false);
      }
    }
  }

  async function handleToggle() {
    if (toggling || disabled) return;

    setToggling(true);

    try {
      await webhookApi.update(jwt, webhook.id, { enabled: !webhook.enabled });
      onToggle(webhook.id, webhook.enabled);
    } catch (e: unknown) {
      // Error handled by parent
    } finally {
      setToggling(false);
    }
  }

  async function handlePing() {
    if (pinging || disabled) return;

    setPinging(true);
    setPingResult(null);

    try {
      const r = await webhookApi.ping(jwt, webhook.id);
      setPingResult({
        success: r.delivery.success,
        message: r.delivery.success
          ? `Success (${r.delivery.statusCode ?? 200})`
          : r.delivery.response || "Failed to deliver test ping",
      });
    } catch (e: unknown) {
      setPingResult({
        success: false,
        message: getErrorMessage(e, "Failed to send test ping."),
      });
    } finally {
      setPinging(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleDeliveries}
          className="shrink-0 text-fg-subtle hover:text-fg transition-colors"
          aria-label={expanded ? "Hide deliveries" : "Show deliveries"}
          aria-expanded={expanded}
        >
          <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono text-fg truncate">{webhook.url}</p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling || disabled}
          className="shrink-0 group"
          aria-label={webhook.enabled ? "Disable webhook" : "Enable webhook"}
        >
          <Badge
            variant={webhook.enabled ? "success" : "default"}
            className="cursor-pointer group-hover:opacity-80 transition-opacity"
          >
            {toggling ? "..." : webhook.enabled ? "active" : "disabled"}
          </Badge>
        </button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onRotate(webhook.id, webhook.url)}
          aria-label={`Rotate secret for ${webhook.url}`}
        >
          Rotate secret
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={pinging}
          disabled={pinging || disabled}
          onClick={handlePing}
          aria-label={`Test webhook ${webhook.url}`}
        >
          {pinging ? "Testing…" : "Test"}
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={disabled}
          onClick={() => onRemove(webhook.id, webhook.url)}
          aria-label={`Remove webhook ${webhook.url}`}
        >
          Remove
        </Button>
      </div>
      {pingResult && (
        <p className={`text-xs ${pingResult.success ? "text-success" : "text-danger"}`}>
          {pingResult.message}
        </p>
      )}

      {expanded && (
        <div className="ml-8 mt-2 rounded-lg bg-surface-strong border border-hairline p-3">
          <h3 className="text-xs font-semibold text-fg mb-2">Recent deliveries</h3>

          {deliveriesLoading && (
            <div className="flex items-center gap-2 text-xs text-fg-faint py-2">
              <span className="animate-spin">⏳</span>
              Loading…
            </div>
          )}

          {deliveriesError && <p className="text-xs text-danger py-2">{deliveriesError}</p>}

          {!deliveriesLoading && !deliveriesError && deliveries && (
            <>
              {deliveries.length === 0 ? (
                <p className="text-xs text-fg-faint py-2">
                  No deliveries yet. This endpoint will receive a POST when a tip lands.
                </p>
              ) : (
                <ul className="space-y-2">
                  {deliveries.map((d) => (
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
                      <TimeAgo iso={d.createdAt} className="text-fg-faint">
                        {timeAgo(d.createdAt)}
                      </TimeAgo>
                      {d.attempt > 1 && (
                        <span className="text-fg-faint text-xs">(attempt {d.attempt})</span>
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
  );
}
