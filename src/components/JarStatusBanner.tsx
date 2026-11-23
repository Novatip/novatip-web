"use client";

/**
 * components/JarStatusBanner.tsx
 *
 * Shows whether the creator's jar is actually registered on the tip_splitter
 * contract. A backend creator row can exist with no jar behind it — claimed
 * before on-chain registration existed, or a wallet signature was rejected
 * during onboarding — and the first tip to one fails with JarNotFound. The
 * creator has no way to see that before a supporter hits it, so this checks
 * proactively and explains how to fix it.
 *
 * A failed check (RPC down, network blip) is swallowed rather than shown as
 * either state: the rest of the dashboard does not depend on this, and a
 * spurious "not registered" from a flaky check would be worse than saying
 * nothing until the next check succeeds.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { readJar } from "@/lib/jar";

type JarStatus = "checking" | "registered" | "missing" | "unknown";

interface JarStatusBannerProps {
  jarId: string;
}

export function JarStatusBanner({ jarId }: JarStatusBannerProps) {
  const [status, setStatus] = useState<JarStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    setStatus("checking");

    readJar(jarId)
      .then((jar) => {
        if (!cancelled) setStatus(jar ? "registered" : "missing");
      })
      .catch(() => {
        if (!cancelled) setStatus("unknown");
      });

    return () => {
      cancelled = true;
    };
  }, [jarId]);

  if (status === "checking" || status === "unknown") return null;

  if (status === "registered") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-fg-faint">
        <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
        Jar registered on-chain
      </p>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 flex flex-col gap-2"
    >
      <p className="text-sm font-semibold text-danger">
        Your jar isn&rsquo;t registered on-chain yet
      </p>
      <p className="text-sm text-fg-subtle">
        Tips to your link will fail until this is fixed. Open Splits and save once — even the
        default 100%-to-you split registers it, no changes required.
      </p>
      <Link
        href="/dashboard/splits"
        className="self-start text-sm font-medium text-accent hover:text-accent-strong"
      >
        Go to Splits →
      </Link>
    </div>
  );
}
