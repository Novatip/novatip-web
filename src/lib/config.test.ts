/**
 * src/lib/config.test.ts
 *
 * Unit tests for resolveSiteUrl — the value behind metadataBase.
 *
 * Covers:
 *   - Unset or blank falls back to the dev origin
 *   - Real deployment values survive intact, including a base path
 *   - Trailing-slash and whitespace differences normalise to one form
 *   - Values that would silently break social previews are rejected loudly
 */

import { describe, it, expect } from "vitest";
import { resolveSiteUrl, DEFAULT_SITE_URL } from "./config";

// ── Falling back ──────────────────────────────────────────────────────────────

describe("resolveSiteUrl – falling back", () => {
  it("uses the dev origin when the variable is unset", () => {
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
  });

  it("treats an empty or whitespace-only value as unset", () => {
    expect(resolveSiteUrl("")).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl("   ")).toBe(DEFAULT_SITE_URL);
  });
});

// ── Accepting real values ─────────────────────────────────────────────────────

describe("resolveSiteUrl – accepting deployment values", () => {
  it("keeps a production origin", () => {
    expect(resolveSiteUrl("https://novatip.xyz")).toBe("https://novatip.xyz/");
  });

  it("keeps a preview-deployment host", () => {
    expect(resolveSiteUrl("https://novatip-web-git-boundaries.vercel.app")).toBe(
      "https://novatip-web-git-boundaries.vercel.app/",
    );
  });

  it("normalises a trailing slash and surrounding whitespace to one form", () => {
    expect(resolveSiteUrl("  https://novatip.xyz/  ")).toBe("https://novatip.xyz/");
    expect(resolveSiteUrl("https://novatip.xyz")).toBe(resolveSiteUrl("https://novatip.xyz/"));
  });

  it("preserves a base path for an app not served from the root", () => {
    expect(resolveSiteUrl("https://example.com/tips")).toBe("https://example.com/tips");
  });

  it("allows plain http, which local and LAN testing need", () => {
    expect(resolveSiteUrl("http://192.168.1.20:3000")).toBe("http://192.168.1.20:3000/");
  });

  it("drops a query or fragment that has no business in a base URL", () => {
    expect(resolveSiteUrl("https://novatip.xyz/?ref=deploy#top")).toBe("https://novatip.xyz/");
  });
});

// ── Rejecting broken values ───────────────────────────────────────────────────

describe("resolveSiteUrl – rejecting broken values", () => {
  it("rejects a bare hostname, the easiest mistake to make", () => {
    expect(() => resolveSiteUrl("novatip.xyz")).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("names the offending value so the build failure is actionable", () => {
    expect(() => resolveSiteUrl("novatip.xyz")).toThrow(/novatip\.xyz/);
    expect(() => resolveSiteUrl("novatip.xyz")).toThrow(/absolute URL/);
  });

  it("rejects a non-http scheme", () => {
    expect(() => resolveSiteUrl("ftp://novatip.xyz")).toThrow(/http or https/);
  });

  it("does not fall back to localhost on a bad value", () => {
    // Falling back would put a localhost preview URL on production pages —
    // the exact failure metadataBase exists to prevent.
    expect(() => resolveSiteUrl("not a url")).toThrow();
  });
});
