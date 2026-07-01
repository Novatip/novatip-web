/**
 * lib/api.ts
 *
 * Typed HTTP client for the novatip-backend REST API.
 * All methods throw ApiError on non-2xx responses.
 */

import { config } from "./config";

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
  init: RequestInit = {},
  jwt?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  const res = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers,
  });

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
  challenge: (walletAddress: string) =>
    request<{ nonce: string }>("/auth/challenge", {
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    }),

  verify: (walletAddress: string, signatureHex: string, publicKeyHex: string) =>
    request<{ jwt: string; isNewUser: boolean }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ walletAddress, signatureHex, publicKeyHex }),
    }),

  me: (jwt: string) =>
    request<{ user: { sub: string; wallet: string; slug: string } }>(
      "/auth/me",
      {},
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
  getBySlug: (slug: string) =>
    request<{ creator: CreatorProfile }>(`/creators/${slug}`),

  checkSlug: (slug: string) =>
    request<{ slug: string; available: boolean }>(`/creators/check/${slug}`),

  claim: (
    jwt: string,
    data: { slug: string; jarId: string; displayName?: string; bio?: string },
  ) =>
    request<{ creator: CreatorProfile }>("/creators/claim", {
      method: "POST",
      body: JSON.stringify(data),
    }, jwt),

  updateProfile: (
    jwt: string,
    data: { displayName?: string; bio?: string; avatarUrl?: string },
  ) =>
    request<{ creator: CreatorProfile }>("/creators/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }, jwt),

  updateSplits: (
    jwt: string,
    splits: Array<{ to: string; bps: number }>,
  ) =>
    request<{ creator: CreatorProfile }>("/creators/me/splits", {
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
  resolve: (slug: string) =>
    request<ResolvedPage>(`/resolve/${slug}`),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analyticsApi = {
  totals: (jwt: string) =>
    request<{
      totalTips: number;
      totalAmountRaw: string;
      uniqueSupporters: number;
    }>("/analytics/totals", {}, jwt),

  timeSeries: (jwt: string, days = 30) =>
    request<{ series: Array<{ date: string; tipCount: number; amountRaw: string }> }>(
      `/analytics/timeseries?days=${days}`,
      {},
      jwt,
    ),

  topSupporters: (jwt: string, limit = 10) =>
    request<{ supporters: Array<{ fromAddress: string; tipCount: number; totalAmountRaw: string }> }>(
      `/analytics/top-supporters?limit=${limit}`,
      {},
      jwt,
    ),

  recent: (jwt: string, limit = 20) =>
    request<{
      tips: Array<{
        id: string;
        fromAddress: string;
        amount: string;
        message: string;
        ledgerAt: string;
      }>;
    }>(`/analytics/recent?limit=${limit}`, {}, jwt),
};

// ── Webhooks ──────────────────────────────────────────────────────────────────

export const webhookApi = {
  list: (jwt: string) =>
    request<{ webhooks: Array<{ id: string; url: string; enabled: boolean }> }>(
      "/webhooks",
      {},
      jwt,
    ),

  create: (jwt: string, url: string, secret?: string) =>
    request<{ webhook: { id: string; url: string; secret: string } }>(
      "/webhooks",
      { method: "POST", body: JSON.stringify({ url, secret }) },
      jwt,
    ),

  remove: (jwt: string, id: string) =>
    request<void>(`/webhooks/${id}`, { method: "DELETE" }, jwt),
};
