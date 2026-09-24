/**
 * lib/onboarding.ts
 *
 * Helpers for resuming an interrupted onboarding flow.
 *
 * Claiming a slug is the one step that persists server-side (backend
 * auth.service.ts creates every new user with a temporary slug up front), so
 * it is the signal the onboarding page uses to tell a returning creator from
 * a brand-new one, rather than always starting back at step one.
 */

// Mirrors novatip-backend's placeholder slug format for a brand-new creator:
// `user_${randomBytes(4).toString("hex")}` in auth.service.ts.
const TEMP_SLUG_PATTERN = /^user_[0-9a-f]{8}$/;

/** Whether a slug is still the auto-generated placeholder, not one the creator claimed. */
export function isTempSlug(slug: string): boolean {
  return TEMP_SLUG_PATTERN.test(slug);
}
