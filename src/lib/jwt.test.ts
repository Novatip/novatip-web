/**
 * src/lib/jwt.test.ts
 *
 * Unit tests for the client-side JWT expiry check.
 *
 * Covers:
 *   - An unexpired token is not treated as expired
 *   - An expired token is treated as expired
 *   - A token with no exp claim is treated as expired, not valid forever
 *   - A token with a non-numeric exp claim is treated as expired
 *   - A malformed token (unparsable payload, missing segments) is treated as expired
 */

import { describe, it, expect } from "vitest";
import { isJwtExpired } from "./jwt";

// ── Helpers ───────────────────────────────────────────────────────────────────

function base64Url(obj: unknown): string {
  const base64 = btoa(JSON.stringify(obj));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = base64Url({ alg: "none", typ: "JWT" });
  return `${header}.${base64Url(payload)}.signature`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("isJwtExpired", () => {
  it("returns false for a token that expires in the future", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(isJwtExpired(makeJwt({ exp }))).toBe(false);
  });

  it("returns true for a token that already expired", () => {
    const exp = Math.floor(Date.now() / 1000) - 3600;
    expect(isJwtExpired(makeJwt({ exp }))).toBe(true);
  });

  it("returns true for a token with no exp claim, not valid forever", () => {
    expect(isJwtExpired(makeJwt({ sub: "user1" }))).toBe(true);
  });

  it("returns true for a token whose exp claim is not a number", () => {
    expect(isJwtExpired(makeJwt({ exp: "never" }))).toBe(true);
  });

  it("returns true for a token with an unparsable payload", () => {
    expect(isJwtExpired("header.not-valid-base64!!.signature")).toBe(true);
  });

  it("returns true for a token missing the payload segment", () => {
    expect(isJwtExpired("justheader")).toBe(true);
  });
});
