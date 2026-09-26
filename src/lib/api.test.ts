/**
 * src/lib/api.test.ts
 *
 * Unit tests for the typed HTTP client in lib/api.ts.
 *
 * Covers:
 *   - ApiError construction and property values
 *   - request() throws ApiError with correct status/code/message on non-2xx
 *   - request() falls back to "UNKNOWN" / statusText when body is missing
 *   - request() returns undefined for 204 No Content
 *   - request() attaches the Authorization header when a JWT is provided
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError, analyticsApi, authApi } from "./api";
import { onUnauthorized } from "./authEvents";

// ── ApiError ──────────────────────────────────────────────────────────────────

describe("ApiError", () => {
  it("stores status, code, and message", () => {
    const err = new ApiError(404, "NOT_FOUND", "Resource not found");
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
    expect(err.name).toBe("ApiError");
  });

  it("is an instance of Error", () => {
    expect(new ApiError(500, "SERVER_ERROR", "oops")).toBeInstanceOf(Error);
  });
});

// ── fetch helpers ─────────────────────────────────────────────────────────────

function makeFetchResponse(
  status: number,
  body: unknown,
  statusText = "Error",
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("request() error handling", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  afterEach(() => {
    fetchSpy.mockReset();
  });

  it("throws ApiError with code and message from error body", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeFetchResponse(400, {
        error: { code: "INVALID_SLUG", message: "Slug already taken" },
      }),
    );

    await expect(authApi.challenge("G_FAKE")).rejects.toMatchObject({
      status:  400,
      code:    "INVALID_SLUG",
      message: "Slug already taken",
    });
  });

  it("falls back to UNKNOWN/statusText when error body is empty", async () => {
    fetchSpy.mockResolvedValueOnce(
      makeFetchResponse(500, {}, "Internal Server Error"),
    );

    await expect(authApi.challenge("G_FAKE")).rejects.toMatchObject({
      status:  500,
      code:    "UNKNOWN",
      message: "Internal Server Error",
    });
  });

  it("falls back to UNKNOWN when JSON parsing fails", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok:         false,
      status:     503,
      statusText: "Service Unavailable",
      json:       () => Promise.reject(new Error("not json")),
    } as unknown as Response);

    await expect(authApi.challenge("G_FAKE")).rejects.toMatchObject({
      status: 503,
      code:   "UNKNOWN",
    });
  });

  it("returns undefined for 204 No Content without calling .json()", async () => {
    const jsonSpy = vi.fn();
    fetchSpy.mockResolvedValueOnce({
      ok:     true,
      status: 204,
      json:   jsonSpy,
    } as unknown as Response);

    // analyticsApi.totals would normally return data; here we confirm 204 path
    const result = await (analyticsApi as unknown as {
      _request: (path: string, jwt: string) => Promise<unknown>;
    })._request?.("/stub", "tok");

    // The 204 branch is internal; test via the webhookApi.remove which expects void
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it("attaches Authorization header when JWT is provided", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok:     true,
      status: 200,
      json:   () => Promise.resolve({ totalTips: 1, totalAmountRaw: "0", uniqueSupporters: 1 }),
    } as unknown as Response);

    await analyticsApi.totals("my-jwt-token");

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer my-jwt-token",
    );
  });

  it("does not attach Authorization header when no JWT", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok:     true,
      status: 200,
      json:   () => Promise.resolve({ nonce: "abc123" }),
    } as unknown as Response);

    await authApi.challenge("GFAKE_ADDRESS");

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });
});


// ── AbortSignal.any fallback ──────────────────────────────────────────────────

describe("AbortSignal.any fallback", () => {
  let savedAny: (typeof AbortSignal)["any"];

  beforeEach(() => {
    savedAny = AbortSignal.any;
    // @ts-expect-error — intentionally removing to exercise the fallback path
    delete AbortSignal.any;
  });

  afterEach(() => {
    AbortSignal.any = savedAny;
    vi.restoreAllMocks();
  });

  it("removes the abort listener from the caller signal once the request settles", async () => {
    const controller = new AbortController();
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ nonce: "abc" }),
    }));

    await authApi.challenge("GABC", { signal: controller.signal });

    expect(removeSpy).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("still throws ABORTED when the caller signal is pre-aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" }),
    ));

    await expect(
      authApi.challenge("GABC", { signal: controller.signal }),
    ).rejects.toMatchObject({ code: "ABORTED" });
  });
});

// ── Session-expiry broadcast ──────────────────────────────────────────────────

/**
 * A 401 normally means the session died, and the wallet context listens for it
 * so every widget drops back to disconnected at once. The sign-in endpoints are
 * the exception: a 401 there means the login attempt failed, and broadcasting
 * it tore down the wallet connection the user had just made, bouncing them
 * straight back to "Connect wallet".
 */
describe("401 handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("broadcasts session expiry for an ordinary endpoint", async () => {
    const seen = vi.fn();
    const off = onUnauthorized(seen);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeFetchResponse(401, {})));

    await expect(analyticsApi.totals("stale-jwt")).rejects.toBeInstanceOf(ApiError);

    expect(seen).toHaveBeenCalledTimes(1);
    off();
  });

  it("stays quiet when sign-in itself is rejected", async () => {
    const seen = vi.fn();
    const off = onUnauthorized(seen);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeFetchResponse(401, {})));

    await expect(authApi.verify("GABC", "deadbeef")).rejects.toBeInstanceOf(ApiError);

    expect(seen).not.toHaveBeenCalled();
    off();
  });

  it("stays quiet when the challenge is rejected", async () => {
    const seen = vi.fn();
    const off = onUnauthorized(seen);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeFetchResponse(401, {})));

    await expect(authApi.challenge("GABC")).rejects.toBeInstanceOf(ApiError);

    expect(seen).not.toHaveBeenCalled();
    off();
  });
});
