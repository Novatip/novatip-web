/**
 * lib/slug.ts
 *
 * Slug normalisation for the public tip route.
 *
 * This lives in lib/ rather than beside the page that uses it because a
 * Next.js page module may only export a fixed set of fields (`default`,
 * `metadata`, `generateMetadata`, and friends). Exporting a helper from
 * app/[slug]/page.tsx just to make it testable fails the build with
 * "normalizeSlug is not a valid Page export field".
 */

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
      return slug.replace(/^@/, "");
    }
    throw err;
  }
}
