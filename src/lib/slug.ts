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

/** Returns true when slug matches the format the backend accepts. */
export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

/**
 * The creator slug for a route parameter.
 *
 * A tip page answers on both `/alice` and `/@alice` — the "@" belongs to the
 * on-chain jar id, not to the URL — and the parameter arrives percent-encoded
 * when the visitor typed the "@", so it is decoded before the prefix is
 * stripped. An "@" anywhere other than the start is left alone.
 *
 * Malformed percent sequences (e.g., %zz, %E0%A4%A) throw URIError from
 * decodeURIComponent. We catch those and treat the slug as-is, which lets
 * a visitor's mistyped link land on the 404 page instead of an error.
 */
export function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/^@/, "");
  } catch (err) {
    if (err instanceof URIError) {
      return slug.replace(/^(?:@|%40)/, "");
    }
    throw err;
  }
}
