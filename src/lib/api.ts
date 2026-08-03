/**
 * lib/api.ts
 *
 * Typed HTTP client for the novatip-backend REST API.
 * All methods throw ApiError on non-2xx responses.
 */

import { config } from "./config";

export interface RequestOptions extends Omit<RequestInit, "signal"> {
  timeout?: number;
  signal?: AbortSignal | null;
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

  const timeoutMs = init.timeout ?? 10000;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const callerSignal = init.signal;

  let signal: AbortSignal;
  if (callerSignal) {
    if (typeof AbortSignal.any === "function") {
      signal = AbortSignal.any([callerSignal, timeoutSignal]);
    } else {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
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
  } catch (err: any) {
    const isAbort =
      err.name === "AbortError" ||
      err.name === "TimeoutError" ||
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
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    }),

  verify: (walletAddress: string, signatureHex: string, publicKeyHex: string, options?: RequestOptions) =>
    request<{ jwt: string; isNewUser: boolean }>("/auth/verify", {
      ...options,
      method: "POST",
      body: JSON.stringify({ walletAddress, signatureHex, publicKeyHex }),
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
};

// ── Resolver ──────────────────────────────────────────────────────────────────

export interface ResolvedPage {
  creator:   CreatorProfile;
  tipUrl:    string;
  qrSvgUrl:  string;
  qrPngUrl:  string;
}

export const resolverApi = {
  resolve: (slug: string, options?: RequestOptions) =>
    request<ResolvedPage>(`/resolve/${slug}`, options),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

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

  recent: (jwt: string, limit = 20, options?: RequestOptions) =>
    request<{
      tips: Array<{
        id: string;
        fromAddress: string;
        amount: string;
        message: string;
        ledgerAt: string;
      }>;
    }>(`/analytics/recent?limit=${limit}`, options, jwt),
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
