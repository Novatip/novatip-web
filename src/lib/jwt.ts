/**
 * lib/jwt.ts
 *
 * Client-side JWT expiry check, used purely as a UX optimisation to skip a
 * guaranteed-failing round trip on rehydrate. The server remains the sole
 * authority on validity — this never replaces the 401 handling in
 * lib/authEvents.ts.
 */

export function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const { exp } = JSON.parse(atob(padded)) as { exp?: number };

    // No usable exp claim is treated as expired, not as valid forever — the
    // server is the actual authority on the token either way, so the safe
    // default here is the one that triggers the round trip rather than the
    // one that skips it.
    if (typeof exp !== "number") return true;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}
