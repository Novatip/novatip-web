/**
 * lib/api.ts
 *
 * Typed HTTP client for the novatip-backend REST API.
 * All methods throw ApiError on non-2xx responses.
 */

import { config, DEFAULT_REQUEST_TIMEOUT_MS } from "./config";
import { emitUnauthorized } from "./authEvents";

export interface RequestOptions extends Omit<RequestInit, "signal"> {
  timeout?: number;
  signal?: AbortSignal | null;
  /**
   * Skip the global "session expired" broadcast on a 401.
   *
   * Set for the sign-in endpoints. A 401 from /auth/challenge or /auth/verify
   * means the login attempt failed, not that an existing session died — and
   * broadcasting it tears down the wallet connection the user just made,
   * bouncing them back to "Connect wallet".
   */
  skipUnauthorizedBroadcast?: boolean;
}

// ── Error ─────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Safely read a message out of a caught value of unknown shape.
 *
 * A rejected request is almost always an ApiError or a plain Error, but
 * nothing guarantees it — `throw "oops"` is valid JS. Narrow before reading
 * `.message` rather than trusting every catch's shape.
 */
export function getErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  return err instanceof Error ? err.message : fallback;
}

// ── Base fetch ────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  init: RequestOptions = {},
  jwt?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  const timeoutMs = init.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const callerSignal = init.signal;

  let signal: AbortSignal;
  let cleanup: (() => void) | undefined;
  if (callerSignal) {
    if (typeof AbortSignal.any === "function") {
      signal = AbortSignal.any([callerSignal, timeoutSignal]);
    } else {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      cleanup = () => {
        callerSignal.removeEventListener("abort", onAbort);
        timeoutSignal.removeEventListener("abort", onAbort);
      };
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason);
      } else {
        callerSignal.addEventListener("abort", onAbort);
      }
      if (timeoutSignal.aborted) {
        controller.abort(timeoutSignal.reason);
      } else {
        timeoutSignal.addEventListener("abort", onAbort);
      }
      signal = controller.signal;
    }
  } else {
    signal = timeoutSignal;
  }

  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      ...init,
      headers,
      signal,
    });
    cleanup?.();
  } catch (err: unknown) {
    cleanup?.();
    // fetch() rejects with a DOMException (AbortError) or a TypeError
    // (network failure) — neither is guaranteed to be an Error instance, so
    // .name is read via a duck-typed check rather than assuming the shape.
    const errName =
      typeof err === "object" && err !== null && "name" in err
        ? String((err as { name: unknown }).name)
        : undefined;
    const isAbort =
      errName === "AbortError" ||
      errName === "TimeoutError" ||
      callerSignal?.aborted ||
      timeoutSignal.aborted;

    if (isAbort) {
      if (timeoutSignal.aborted && (!callerSignal || !callerSignal.aborted)) {
        throw new ApiError(408, "TIMEOUT", "Request timed out");
      }
      throw new ApiError(0, "ABORTED", "Request aborted");
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const err  = body["error"] as Record<string, unknown> | undefined;

    // A 401 from any endpoint means the session is no longer valid, whether
    // it expired or was never valid to begin with. Handle it in one place
    // rather than leaving every caller to notice its own 401.
    if (res.status === 401 && !init.skipUnauthorizedBroadcast) emitUnauthorized();

    throw new ApiError(
      res.status,
      (err?.["code"] as string) ?? "UNKNOWN",
      (err?.["message"] as string) ?? res.statusText,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  challenge: (walletAddress: string, options?: RequestOptions) =>
    request<{ nonce: string }>("/auth/challenge", {
      ...options,
      skipUnauthorizedBroadcast: true,
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    }),

  verify: (walletAddress: string, signatureHex: string, options?: RequestOptions) =>
    request<{ jwt: string; isNewUser: boolean }>("/auth/verify", {
      ...options,
      skipUnauthorizedBroadcast: true,
      method: "POST",
      body: JSON.stringify({ walletAddress, signatureHex }),
    }),

  me: (jwt: string, options?: RequestOptions) =>
    request<{ user: { sub: string; wallet: string; slug: string } }>(
      "/auth/me",
      options,
      jwt,
    ),
};

// ── Creators ──────────────────────────────────────────────────────────────────

export interface CreatorProfile {
  id:          string;
  slug:        string;
  displayName: string | null;
  bio:         string | null;
  avatarUrl:   string | null;
  jarId:       string;
  splits:      Array<{ to: string; bps: number }>;
  createdAt:   string;
}

export const creatorApi = {
  getBySlug: (slug: string, options?: RequestOptions) =>
    request<{ creator: CreatorProfile }>(`/creators/${slug}`, options),

  checkSlug: (slug: string, options?: RequestOptions) =>
    request<{ slug: string; available: boolean }>(`/creators/check/${slug}`, options),

  claim: (
    jwt: string,
    data: { slug: string; jarId: string; displayName?: string; bio?: string },
    options?: RequestOptions,
  ) =>
    request<{ creator: CreatorProfile }>("/creators/claim", {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    }, jwt),

  updateProfile: (
    jwt: string,
    data: { displayName?: string; bio?: string; avatarUrl?: string },
    options?: RequestOptions,
  ) =>
    request<{ creator: CreatorProfile }>("/creators/me", {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    }, jwt),

  updateSplits: (
    jwt: string,
    splits: Array<{ to: string; bps: number }>,
    options?: RequestOptions,
  ) =>
    request<{ creator: CreatorProfile }>("/creators/me/splits", {
      ...options,
      method: "PATCH",
      body: JSON.stringify({ splits }),
    }, jwt),

  // Renames the creator's public slug. Does not touch jarId — the on-chain
  // jar stays registered under the id it was created with, so a rename only
  // ever changes where the tip page and links resolve, never the contract
  // state splits are paid through.
  updateSlug: (
    jwt: string,
    slug: string,
    options?: RequestOptions,
  ) =>
    request<{ creator: CreatorProfile }>("/creators/me/slug", {
      ...options,
      method: "PATCH",
      body: JSON.stringify({ slug }),
    }, jwt),
};

// ── Resolver ──────────────────────────────────────────────────────────────────

export interface PublicTip {
  id:          string;
  fromAddress: string;
  amount:      string;
  message:     string;
  ledgerAt:    string;
}

export interface ResolvedPage {
  creator:    CreatorProfile;
  tipUrl:     string;
  qrSvgUrl:   string;
  qrPngUrl:   string;
  recentTips: PublicTip[];
}

export const resolverApi = {
  resolve: (slug: string, options?: RequestOptions) =>
    request<ResolvedPage>(`/resolve/${slug}`, options),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

/** The largest `limit` the backend accepts on /analytics/recent. */
export const RECENT_TIPS_MAX_LIMIT = 100;

export const analyticsApi = {
  totals: (jwt: string, options?: RequestOptions) =>
    request<{
      totalTips: number;
      totalAmountRaw: string;
      uniqueSupporters: number;
    }>("/analytics/totals", options, jwt),

  timeSeries: (jwt: string, days = 30, options?: RequestOptions) =>
    request<{ series: Array<{ date: string; tipCount: number; amountRaw: string }> }>(
      `/analytics/timeseries?days=${days}`,
      options,
      jwt,
    ),

  topSupporters: (jwt: string, limit = 10, options?: RequestOptions) =>
    request<{ supporters: Array<{ fromAddress: string; tipCount: number; totalAmountRaw: string }> }>(
      `/analytics/top-supporters?limit=${limit}`,
      options,
      jwt,
    ),

  recent: (jwt: string, limit = 20, options?: RequestOptions, offset = 0) =>
    request<{
      tips: Array<{
        id: string;
        fromAddress: string;
        amount: string;
        message: string;
        ledgerAt: string;
      }>;
    }>(
      // Clamped here so no caller can send a limit the backend rejects.
      `/analytics/recent?limit=${Math.min(Math.max(limit, 1), RECENT_TIPS_MAX_LIMIT)}&offset=${Math.max(offset, 0)}`,
      options,
      jwt,
    ),
};

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  /** Receive an email after each indexed tip. */
  emailEnabled:   boolean;
  /** Receive a webhook POST after each indexed tip. */
  webhookEnabled: boolean;
}

export const notificationsApi = {
  getPreferences: (jwt: string, options?: RequestOptions) =>
    request<{ preferences: NotificationPreferences }>(
      "/notifications/preferences",
      options,
      jwt,
    ),

  updatePreferences: (
    jwt: string,
    prefs: Partial<NotificationPreferences>,
    options?: RequestOptions,
  ) =>
    request<{ preferences: NotificationPreferences }>(
      "/notifications/preferences",
      { ...options, method: "PATCH", body: JSON.stringify(prefs) },
      jwt,
    ),
};

// ── Webhooks ──────────────────────────────────────────────────────────────────

export const webhookApi = {
  list: (jwt: string, options?: RequestOptions) =>
    request<{ webhooks: Array<{ id: string; url: string; enabled: boolean }> }>(
      "/webhooks",
      options,
      jwt,
    ),

  create: (jwt: string, url: string, secret?: string, options?: RequestOptions) =>
    request<{ webhook: { id: string; url: string; secret: string } }>(
      "/webhooks",
      { ...options, method: "POST", body: JSON.stringify({ url, secret }) },
      jwt,
    ),

  remove: (jwt: string, id: string, options?: RequestOptions) =>
    request<void>(`/webhooks/${id}`, { ...options, method: "DELETE" }, jwt),
};
