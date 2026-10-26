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

import { describe, it, expect, vi } from "vitest";
import { resolveSiteUrl, DEFAULT_SITE_URL, resolveUsdcContractId, TESTNET_USDC_CONTRACT_ID, resolveApiUrl, DEFAULT_API_URL } from "./config";

// ── resolveApiUrl ─────────────────────────────────────────────────────────────

describe("resolveApiUrl – development / test fallback", () => {
  it("returns the localhost default when unset in non-production", () => {
    // NODE_ENV is 'test' in vitest — localhost should be the fallback
    expect(resolveApiUrl(undefined)).toBe(DEFAULT_API_URL);
    expect(resolveApiUrl("")).toBe(DEFAULT_API_URL);
    expect(resolveApiUrl("   ")).toBe(DEFAULT_API_URL);
  });
});

describe("resolveApiUrl – production requires the variable", () => {
  it("throws when unset in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(() => resolveApiUrl(undefined)).toThrow(/NEXT_PUBLIC_API_URL/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("names the variable in the production error message", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(() => resolveApiUrl(undefined)).toThrow(/NEXT_PUBLIC_API_URL/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("resolveApiUrl – accepting valid URLs", () => {
  it("returns a valid https URL unchanged", () => {
    expect(resolveApiUrl("https://api.example.com/api/v1")).toBe(
      "https://api.example.com/api/v1",
    );
  });

  it("accepts http, which local and LAN testing need", () => {
    expect(resolveApiUrl("http://192.168.1.5:3001/api/v1")).toBe(
      "http://192.168.1.5:3001/api/v1",
    );
  });
});

describe("resolveApiUrl – rejecting invalid URLs", () => {
  it("rejects a bare hostname", () => {
    expect(() => resolveApiUrl("api.example.com")).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it("rejects a non-http scheme", () => {
    expect(() => resolveApiUrl("ftp://api.example.com/v1")).toThrow(/http or https/);
  });
});

// ── resolveUsdcContractId ─────────────────────────────────────────────────────

const VALID_CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";

describe("resolveUsdcContractId – testnet / local defaults", () => {
  it("returns the testnet USDC address when unset on testnet", () => {
    expect(resolveUsdcContractId(undefined, "testnet")).toBe(TESTNET_USDC_CONTRACT_ID);
  });

  it("returns the testnet USDC address when unset on local", () => {
    expect(resolveUsdcContractId(undefined, "local")).toBe(TESTNET_USDC_CONTRACT_ID);
  });
});

describe("resolveUsdcContractId – mainnet requires the variable", () => {
  it("throws when the variable is absent on mainnet", () => {
    expect(() => resolveUsdcContractId(undefined, "mainnet")).toThrow(
      /NEXT_PUBLIC_USDC_CONTRACT_ID/,
    );
  });

  it("names mainnet in the error so it is clear why the default was not used", () => {
    expect(() => resolveUsdcContractId(undefined, "mainnet")).toThrow(/mainnet/);
  });
});

describe("resolveUsdcContractId – validation", () => {
  it("accepts and returns a valid contract ID on any network", () => {
    expect(resolveUsdcContractId(VALID_CONTRACT_ID, "testnet")).toBe(VALID_CONTRACT_ID);
    expect(resolveUsdcContractId(VALID_CONTRACT_ID, "mainnet")).toBe(VALID_CONTRACT_ID);
  });

  it("throws for an invalid contract ID regardless of network", () => {
    expect(() => resolveUsdcContractId("not-a-contract", "testnet")).toThrow(
      /NEXT_PUBLIC_USDC_CONTRACT_ID/,
    );
    expect(() => resolveUsdcContractId("not-a-contract", "mainnet")).toThrow(
      /NEXT_PUBLIC_USDC_CONTRACT_ID/,
    );
  });
});

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
