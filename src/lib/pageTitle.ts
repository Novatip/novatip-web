/**
 * lib/pageTitle.ts
 *
 * Builds the document title for a route in one place so the dashboard and
 * onboarding pages share a single pattern.
 *
 * The root layout sets the site-wide title. A nested layout that exports its
 * own `metadata.title` replaces it outright — Next does not append the parent
 * title — so the suffix has to be part of every page title. Keeping that in a
 * helper means a new route cannot quietly drift to a different separator or
 * forget the brand half.
 *
 * These layouts exist because the pages themselves are client components,
 * which cannot export route metadata.
 */

import type { Metadata } from "next";

export function pageTitle(title: string): Metadata {
  return { title: `${title} | Novatip` };
}
