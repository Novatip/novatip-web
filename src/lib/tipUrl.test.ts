/**
 * src/lib/tipUrl.test.ts
 *
 * Unit tests for getTipUrl and getQrPngUrl.
 *
 * Covers:
 *   - Client-side branch uses window.location.origin
 *   - Server-side branch (window undefined) uses config.siteUrl
 *   - No hardcoded domain appears in the server-side output
 *   - The QR PNG URL is built from config.apiUrl without a doubled slash
 *
 * Every test that needs a different config mocks it and then unmocks in a
 * finally, because a `vi.doMock` left registered leaks into later tests —
 * which previously made one case assert a URL containing a doubled slash.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { getTipUrl } from "./tipUrl";

afterEach(() => {
  vi.doUnmock("./config");
  vi.resetModules();
  vi.restoreAllMocks();
});

/** Run `fn` with `window` removed, to exercise the server-rendered branch. */
async function withoutWindow<T>(fn: () => Promise<T>): Promise<T> {
  const windowBackup = globalThis.window;
  // @ts-expect-error — intentionally removing window to simulate SSR
  delete globalThis.window;
  try {
    return await fn();
  } finally {
    globalThis.window = windowBackup;
  }
}

/** Import getTipUrl against a mocked siteUrl. */
async function tipUrlWithSiteUrl(siteUrl: string) {
  vi.resetModules();
  vi.doMock("./config", () => ({ config: { siteUrl } }));
  const mod = await import("./tipUrl");
  return mod.getTipUrl;
}

// ── Client-side branch ────────────────────────────────────────────────────────

describe("getTipUrl – client side (window defined)", () => {
  it("uses the configured site URL when explicitly set", async () => {
    vi.resetModules();
    vi.doMock("./config", () => ({
      config: { siteUrl: "https://novatip.xyz" },
      DEFAULT_SITE_URL: "http://localhost:3000",
    }));
    const { getTipUrl: getUrl } = await import("./tipUrl");
    expect(getUrl("alice")).toBe("https://novatip.xyz/alice");
  });

  it("falls back to window.location.origin when site URL is the default", async () => {
    vi.resetModules();
    vi.doMock("./config", () => ({
      config: { siteUrl: "http://localhost:3000" },
      DEFAULT_SITE_URL: "http://localhost:3000",
    }));
    const { getTipUrl: getUrl } = await import("./tipUrl");
    expect(getUrl("bob")).toBe(`${window.location.origin}/bob`);
  });

  it("strips trailing slash from configured site URL", async () => {
    vi.resetModules();
    vi.doMock("./config", () => ({
      config: { siteUrl: "https://novatip.xyz/" },
      DEFAULT_SITE_URL: "http://localhost:3000",
    }));
    const { getTipUrl: getUrl } = await import("./tipUrl");
    expect(getUrl("charlie")).toBe("https://novatip.xyz/charlie");
  });

  it("percent-encodes a slug containing characters that need encoding", async () => {
    vi.resetModules();
    vi.doMock("./config", () => ({
      config: { siteUrl: "https://novatip.xyz" },
      DEFAULT_SITE_URL: "http://localhost:3000",
    }));
    const { getTipUrl: getUrl } = await import("./tipUrl");
    expect(getUrl("john doe")).toBe("https://novatip.xyz/john%20doe");
  });
});

// ── Server-side branch ────────────────────────────────────────────────────────

describe("getTipUrl – server side (window undefined)", () => {
  it("uses config.siteUrl when window is not defined", async () => {
    await withoutWindow(async () => {
      const getUrl = await tipUrlWithSiteUrl("https://example.com");
      expect(getUrl("alice")).toBe("https://example.com/alice");
    });
  });

  it("strips a trailing slash from siteUrl before appending the slug", async () => {
    await withoutWindow(async () => {
      const getUrl = await tipUrlWithSiteUrl("https://example.com/");
      expect(getUrl("charlie")).toBe("https://example.com/charlie");
    });
  });

  it("reflects a custom deployment domain, not a hardcoded one", async () => {
    await withoutWindow(async () => {
      const getUrl = await tipUrlWithSiteUrl("https://myapp.example.io/");
      const url = getUrl("dana");
      expect(url).toBe("https://myapp.example.io/dana");
      expect(url).not.toContain("novatip.xyz");
    });
  });

  it("percent-encodes a slug containing characters that need encoding", async () => {
    await withoutWindow(async () => {
      const getUrl = await tipUrlWithSiteUrl("https://example.com/");
      expect(getUrl("john doe")).toBe("https://example.com/john%20doe");
    });
  });
});

// ── getQrPngUrl ───────────────────────────────────────────────────────────────

describe("getQrPngUrl", () => {
  /** Import getQrPngUrl against a mocked apiUrl. */
  async function qrUrlWithApiUrl(apiUrl: string) {
    vi.resetModules();
    vi.doMock("./config", () => ({ config: { apiUrl } }));
    const mod = await import("./tipUrl");
    return mod.getQrPngUrl;
  }

  it("builds the QR PNG URL by appending /qr/<slug>/png to config.apiUrl", async () => {
    const getUrl = await qrUrlWithApiUrl("http://localhost:3001/api/v1");
    expect(getUrl("alice")).toBe("http://localhost:3001/api/v1/qr/alice/png");
  });

  it("handles a trailing slash in config.apiUrl without doubling it", async () => {
    const getUrl = await qrUrlWithApiUrl("http://localhost:3001/api/v1/");
    expect(getUrl("bob")).toBe("http://localhost:3001/api/v1/qr/bob/png");
  });

  it("percent-encodes the slug in the QR PNG URL", async () => {
    const getUrl = await qrUrlWithApiUrl("http://localhost:3001/api/v1");
    expect(getUrl("john doe")).toBe("http://localhost:3001/api/v1/qr/john%20doe/png");
  });
});
