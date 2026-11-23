/**
 * src/lib/securityHeaders.test.ts
 *
 * Asserts the security headers declared in next.config.mjs.
 *
 * Covers:
 *   - headers() applies one rule to every route
 *   - The four expected headers are present with the expected values
 */

import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config.mjs";

describe("next.config headers()", () => {
  it("applies a single rule to every route", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
  });

  it("sends the four security headers", async () => {
    const [rule] = await nextConfig.headers!();
    const headers = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));

    expect(Object.keys(headers).sort()).toEqual([
      "Permissions-Policy",
      "Referrer-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
    ]);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("denies powerful browser features in Permissions-Policy", async () => {
    const [rule] = await nextConfig.headers!();
    const policy = rule.headers.find((h) => h.key === "Permissions-Policy")!.value;

    for (const feature of ["camera", "microphone", "geolocation"]) {
      expect(policy).toContain(`${feature}=()`);
    }
  });
});
