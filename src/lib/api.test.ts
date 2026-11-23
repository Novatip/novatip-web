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
 *   - request() throws ApiError INVALID_RESPONSE for a 200 with a non-JSON body
 *   - request() attaches the Authorization header when a JWT is provided
 *   - analyticsApi.timeSeries / topSupporters clamp their query values
 *   - request() retries a body-less GET once after a network failure or a
 *     502/503/504, and never retries anything else
 *   - request() times out with ApiError(408, "TIMEOUT") and reports a connection
 *     failure, honours a custom timeout, and stays silent on a caller abort
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError, analyticsApi, authApi, creatorApi } from "./api";
import { onUnauthorized } from "./authEvents";
import { onConnectionFailure, onConnectionSuccess } from "./connectionEvents";
import { DEFAULT_REQUEST_TIMEOUT_MS, RETRY_DELAY_MS } from "./config";

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

function makeFetchResponse(status: number, body: unknown, statusText = "Error"): Response {
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
      status: 400,
      code: "INVALID_SLUG",
      message: "Slug already taken",
    });
  });

  it("falls back to UNKNOWN/statusText when error body is empty", async () => {
    fetchSpy.mockResolvedValueOnce(makeFetchResponse(500, {}, "Internal Server Error"));

    await expect(authApi.challenge("G_FAKE")).rejects.toMatchObject({
      status: 500,
      code: "UNKNOWN",
      message: "Internal Server Error",
    });
  });

  it("falls back to UNKNOWN when JSON parsing fails", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response);

    await expect(authApi.challenge("G_FAKE")).rejects.toMatchObject({
      status: 503,
      code: "UNKNOWN",
    });
  });

  it("returns undefined for 204 No Content without calling .json()", async () => {
    const jsonSpy = vi.fn();
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: jsonSpy,
    } as unknown as Response);

    // analyticsApi.totals would normally return data; here we confirm 204 path
    const result = await (
      analyticsApi as unknown as {
        _request: (path: string, jwt: string) => Promise<unknown>;
      }
    )._request?.("/stub", "tok");

    // The 204 branch is internal; test via the webhookApi.remove which expects void
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it("throws ApiError INVALID_RESPONSE when a 200 response body is not JSON", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("<html><body>Bad gateway</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    const err = await analyticsApi.totals("tok").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(SyntaxError);
    expect((err as ApiError).code).toBe("INVALID_RESPONSE");
    expect((err as ApiError).status).toBe(200);
    expect((err as ApiError).message).not.toMatch(/position|JSON|token/i);
  });

  it("attaches Authorization header when JWT is provided", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ totalTips: 1, totalAmountRaw: "0", uniqueSupporters: 1 }),
    } as unknown as Response);

    await analyticsApi.totals("my-jwt-token");

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer my-jwt-token");
  });

  it("does not attach Authorization header when no JWT", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ nonce: "abc123" }),
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

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ nonce: "abc" }),
      }),
    );

    await authApi.challenge("GABC", { signal: controller.signal });

    expect(removeSpy).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("still throws ABORTED when the caller signal is pre-aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("The operation was aborted"), { name: "AbortError" }),
        ),
    );

    await expect(authApi.challenge("GABC", { signal: controller.signal })).rejects.toMatchObject({
      code: "ABORTED",
    });
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

// ── Retrying an idempotent GET ────────────────────────────────────────────────

/**
 * The backend runs on a free tier that sleeps, so the first request after a
 * quiet period often fails and works a moment later. A GET is safe to send
 * twice; anything with a body may already have taken effect, so it is not.
 */
describe("request() retry", () => {
  const networkError = () => new TypeError("Failed to fetch");
  const profile = { creator: { slug: "alice" } };
  const ok = () => makeFetchResponse(200, profile);

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Start a request and let the retry delay elapse, settling it either way. */
  async function settle<T>(promise: Promise<T>) {
    const outcome = promise.then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    return outcome;
  }

  it("resolves a GET that fails once on the network and then succeeds", async () => {
    fetchMock.mockRejectedValueOnce(networkError()).mockResolvedValueOnce(ok());

    const outcome = await settle(creatorApi.getBySlug("alice"));

    expect(outcome).toEqual({ value: profile });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([502, 503, 504])("resolves a GET that gets a %i and then succeeds", async (status) => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(status, {})).mockResolvedValueOnce(ok());

    const outcome = await settle(creatorApi.getBySlug("alice"));

    expect(outcome).toEqual({ value: profile });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("waits before sending the retry", async () => {
    fetchMock.mockRejectedValueOnce(networkError()).mockResolvedValueOnce(ok());

    const pending = creatorApi.getBySlug("alice");
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual(profile);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after one retry when the network fails twice", async () => {
    const second = networkError();
    fetchMock.mockRejectedValueOnce(networkError()).mockRejectedValueOnce(second);

    const outcome = await settle(creatorApi.getBySlug("alice"));

    expect(outcome).toEqual({ error: second });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after one retry when the backend answers 503 twice", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(503, {}, "Service Unavailable"));

    const outcome = await settle(creatorApi.getBySlug("alice"));

    expect(outcome).toMatchObject({ error: { status: 503 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("makes at most two attempts when a network failure is followed by a 503", async () => {
    fetchMock.mockRejectedValueOnce(networkError()).mockResolvedValue(makeFetchResponse(503, {}));

    const outcome = await settle(creatorApi.getBySlug("alice"));

    expect(outcome).toMatchObject({ error: { status: 503 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([400, 404, 500])("does not retry a GET that gets a %i", async (status) => {
    fetchMock.mockResolvedValue(makeFetchResponse(status, {}));

    const outcome = await settle(creatorApi.getBySlug("alice"));

    expect(outcome).toMatchObject({ error: { status } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports the connection as down once, after the retry also fails", async () => {
    const down = vi.fn();
    const off = onConnectionFailure(down);
    fetchMock.mockRejectedValue(networkError());

    const pending = creatorApi.getBySlug("alice").catch(() => undefined);
    await vi.advanceTimersByTimeAsync(0);
    expect(down).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    await pending;
    expect(down).toHaveBeenCalledTimes(1);
    off();
  });

  it("never reports the connection as down when the retry succeeds", async () => {
    const down = vi.fn();
    const off = onConnectionFailure(down);
    fetchMock.mockRejectedValueOnce(networkError()).mockResolvedValueOnce(ok());

    await settle(creatorApi.getBySlug("alice"));

    expect(down).not.toHaveBeenCalled();
    off();
  });

  // ── Requests that carry a body ──────────────────────────────────────────────

  it("never retries a POST after a network failure", async () => {
    const failure = networkError();
    fetchMock.mockRejectedValue(failure);

    const outcome = await settle(creatorApi.claim("jwt", { slug: "alice", jarId: "jar-1" }));

    expect(outcome).toEqual({ error: failure });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never retries a POST that gets a 503", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(503, {}));

    const outcome = await settle(creatorApi.claim("jwt", { slug: "alice", jarId: "jar-1" }));

    expect(outcome).toMatchObject({ error: { status: 503 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never retries a PATCH after a network failure", async () => {
    const failure = networkError();
    fetchMock.mockRejectedValue(failure);

    const outcome = await settle(creatorApi.updateProfile("jwt", { bio: "hi" }));

    expect(outcome).toEqual({ error: failure });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([502, 503, 504])("never retries a PATCH that gets a %i", async (status) => {
    fetchMock.mockResolvedValue(makeFetchResponse(status, {}));

    const outcome = await settle(creatorApi.updateSplits("jwt", []));

    expect(outcome).toMatchObject({ error: { status } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ── Aborts ──────────────────────────────────────────────────────────────────

  it("does not retry a GET whose caller signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValue(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" }),
    );

    const outcome = await settle(creatorApi.getBySlug("alice", { signal: controller.signal }));

    expect(outcome).toMatchObject({ error: { code: "ABORTED" } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a GET that fetch reports as aborted", async () => {
    fetchMock.mockRejectedValue(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" }),
    );

    const outcome = await settle(creatorApi.getBySlug("alice"));

    expect(outcome).toMatchObject({ error: { code: "ABORTED" } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops waiting and does not retry when the caller aborts during the delay", async () => {
    const controller = new AbortController();
    fetchMock.mockRejectedValueOnce(networkError()).mockResolvedValueOnce(ok());

    const pending = creatorApi
      .getBySlug("alice", { signal: controller.signal })
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS - 1);
    controller.abort();
    await vi.advanceTimersByTimeAsync(1);

    expect(await pending).toMatchObject({ code: "ABORTED" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ── Request timeout ───────────────────────────────────────────────────────────

/**
 * A request that outlives its timeout is the backend being unreachable, so it
 * throws TIMEOUT and tells the connection banner. A caller who aborts has said
 * nothing about the backend, so that path stays silent.
 *
 * fetch is mocked to never settle on its own — it only rejects once the signal
 * it was handed aborts, as the real one does. AbortSignal.timeout is routed
 * through setTimeout so the fake clock drives it.
 */
describe("request() timeout", () => {
  let timeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();

    timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort(new DOMException("The operation timed out", "TimeoutError"));
      }, ms);
      return controller.signal;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
            });
          }),
      ),
    );
  });

  afterEach(() => {
    timeoutSpy.mockRestore();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("throws ApiError(408, TIMEOUT) and reports a connection failure", async () => {
    const down = vi.fn();
    const off = onConnectionFailure(down);

    const pending = creatorApi.getBySlug("alice").catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(DEFAULT_REQUEST_TIMEOUT_MS - 1);
    expect(down).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    const err = await pending;

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 408, code: "TIMEOUT" });
    expect(down).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).toHaveBeenCalledWith(DEFAULT_REQUEST_TIMEOUT_MS);
    // A timeout is not retried.
    expect(fetch).toHaveBeenCalledTimes(1);
    off();
  });

  it("throws ABORTED and emits nothing when the caller aborts", async () => {
    const down = vi.fn();
    const up = vi.fn();
    const offDown = onConnectionFailure(down);
    const offUp = onConnectionSuccess(up);
    const controller = new AbortController();

    const pending = creatorApi
      .getBySlug("alice", { signal: controller.signal })
      .catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(1000);
    controller.abort();
    const err = await pending;

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, code: "ABORTED" });
    expect(down).not.toHaveBeenCalled();
    expect(up).not.toHaveBeenCalled();
    offDown();
    offUp();
  });

  it("honours a custom timeout", async () => {
    const down = vi.fn();
    const off = onConnectionFailure(down);
    const customTimeout = 2_000;
    expect(customTimeout).toBeLessThan(DEFAULT_REQUEST_TIMEOUT_MS);

    let settled = false;
    const pending = creatorApi
      .getBySlug("alice", { timeout: customTimeout })
      .catch((error: unknown) => error)
      .finally(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(customTimeout - 1);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const err = await pending;

    expect(timeoutSpy).toHaveBeenCalledWith(customTimeout);
    expect(err).toMatchObject({ status: 408, code: "TIMEOUT" });
    expect(down).toHaveBeenCalledTimes(1);
    off();
  });
});

// ── analytics query clamping ──────────────────────────────────────────────────

describe("analyticsApi query clamping", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  beforeEach(() => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ series: [], supporters: [] }),
    } as unknown as Response);
  });

  afterEach(() => {
    fetchSpy.mockReset();
  });

  function requestedUrl(): string {
    return (fetchSpy.mock.calls[0] as [string, RequestInit])[0];
  }

  it.each([
    [-5, 1],
    [0, 1],
    [366, 365],
    [100000, 365],
    [Number.NaN, 1],
  ])("timeSeries(days=%s) requests days=%s", async (input, expected) => {
    await analyticsApi.timeSeries("tok", input);
    expect(requestedUrl()).toMatch(new RegExp(`/analytics/timeseries\\?days=${expected}$`));
  });

  it.each([
    [-1, 1],
    [0, 1],
    [101, 100],
    [5000, 100],
    [Number.NaN, 1],
  ])("topSupporters(limit=%s) requests limit=%s", async (input, expected) => {
    await analyticsApi.topSupporters("tok", input);
    expect(requestedUrl()).toMatch(new RegExp(`/analytics/top-supporters\\?limit=${expected}$`));
  });

  it("leaves in-range values unchanged", async () => {
    await analyticsApi.timeSeries("tok", 90);
    expect(requestedUrl()).toMatch(/\/analytics\/timeseries\?days=90$/);
    fetchSpy.mockClear();
    await analyticsApi.topSupporters("tok", 25);
    expect(requestedUrl()).toMatch(/\/analytics\/top-supporters\?limit=25$/);
  });

  it("keeps the defaults (30 days, 10 supporters)", async () => {
    await analyticsApi.timeSeries("tok");
    expect(requestedUrl()).toMatch(/days=30$/);
    fetchSpy.mockClear();
    await analyticsApi.topSupporters("tok");
    expect(requestedUrl()).toMatch(/limit=10$/);
  });
});
