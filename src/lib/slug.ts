/**
 * lib/slug.ts
 *
 * Slug validation and normalisation for the public tip route.
 *
 * This lives in lib/ rather than beside the page that uses it because a
 * Next.js page module may only export a fixed set of fields (`default`,
 * `metadata`, `generateMetadata`, and friends). Exporting a helper from
 * app/[slug]/page.tsx just to make it testable fails the build with
 * "normalizeSlug is not a valid Page export field".
 */

// Mirrors SLUG_REGEX in novatip-backend src/routes/creators.ts.
// Any change to the allowed character set or length limits must be applied
// there too, or the client and server will disagree about what is valid.
export const SLUG_REGEX = /^[a-z0-9_-]{3,32}$/;

// Mirrors RESERVED_SLUGS in novatip-backend src/modules/creator/creator.service.ts.
// The backend reports these as unavailable. Any change to the list must be
// applied there too, or the client will call a reserved slug "Taken" (or
// worse, offer one the backend will refuse).
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "api",
  "admin",
  "dashboard",
  "onboarding",
  "settings",
  "login",
  "logout",
  "auth",
  "support",
  "help",
  "about",
  "terms",
  "privacy",
  "static",
  "_next",
  "novatip",
]);

/** Returns true when slug matches the format the backend accepts. */
export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

/** Returns true when slug is reserved, so the backend will never let it be claimed. */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/**
 * The creator slug for a route parameter.
 *
 * A tip page answers on both `/alice` and `/@alice` — the "@" belongs to the
 * on-chain jar id, not to the URL — and the parameter arrives percent-encoded
 * when the visitor typed the "@", so it is decoded before the prefix is
 * stripped. An "@" anywhere other than the start is left alone.
 *
 * Slugs are lowercase only (see SLUG_REGEX), so the result is lowercased too:
 * a link typed or autocorrected as `/Alice` resolves as `alice` instead of
 * sending `Alice` to the backend.
 *
 * Malformed percent sequences (e.g., %zz, %E0%A4%A) throw URIError from
 * decodeURIComponent. We catch those and treat the slug as-is, which lets
 * a visitor's mistyped link land on the 404 page instead of an error. The
 * fallback is lowercased as well, so the two paths agree on case.
 */
export function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/^@/, "").toLowerCase();
  } catch (err) {
    if (err instanceof URIError) {
      return slug.replace(/^(?:@|%40)/, "").toLowerCase();
    }
    throw err;
  }
}
