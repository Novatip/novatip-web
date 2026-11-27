"use client";

import { useState } from "react";
import { webhookApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { isValidHttpsUrl } from "@/lib/webhooks";

interface AddWebhookFormProps {
  jwt: string;
  onWebhookAdded: (webhook: { id: string; url: string; secret: string }) => void;
}

export function AddWebhookForm({ jwt, onWebhookAdded }: AddWebhookFormProps) {
  const [url, setUrl] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [urlTouched, setUrlTouched] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!jwt || !isValidHttpsUrl(trimmedUrl) || addLoading) return;

    setAddLoading(true);
    setAddError(null);

    try {
      const r = await webhookApi.create(jwt, trimmedUrl);
      onWebhookAdded({
        id: r.webhook.id,
        url: r.webhook.url,
        secret: r.webhook.secret,
      });
      setUrl("");
      setUrlTouched(false);
    } catch (e: unknown) {
      setAddError(getErrorMessage(e, "Failed to register webhook."));
    } finally {
      setAddLoading(false);
    }
  }

  const urlError =
    urlTouched && url.trim() && !isValidHttpsUrl(url) ? "Must be a valid HTTPS URL" : undefined;

  return (
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
  );
}
