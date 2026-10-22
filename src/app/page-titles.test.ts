/**
 * src/app/page-titles.test.ts
 *
 * The dashboard and onboarding pages are client components, so each route's
 * title comes from the small server layout beside it. Those layouts are easy
 * to forget when a page is added or moved — and a missing one is invisible in
 * the UI, silently falling back to the root title.
 *
 * This test pins the contract from issue #227: every route has its own title,
 * and they all follow the "<Page> | Novatip" pattern.
 */

import { describe, it, expect } from "vitest";
import { metadata as overviewMetadata }   from "./dashboard/(overview)/layout";
import { metadata as historyMetadata }    from "./dashboard/history/layout";
import { metadata as splitsMetadata }     from "./dashboard/splits/layout";
import { metadata as qrMetadata }         from "./dashboard/qr/layout";
import { metadata as settingsMetadata }   from "./dashboard/settings/layout";
import { metadata as webhooksMetadata }   from "./dashboard/webhooks/layout";
import { metadata as onboardingMetadata } from "./onboarding/layout";

const ROUTES = [
  ["Overview",   overviewMetadata],
  ["History",    historyMetadata],
  ["Splits",     splitsMetadata],
  ["QR Code",    qrMetadata],
  ["Settings",   settingsMetadata],
  ["Webhooks",   webhooksMetadata],
  ["Onboarding", onboardingMetadata],
] as const;

describe("page titles", () => {
  it.each(ROUTES)("%s layout exports its own title", (name, metadata) => {
    expect(metadata.title).toBe(`${name} | Novatip`);
  });

  it("gives every route a distinct title", () => {
    const titles = ROUTES.map(([, metadata]) => metadata.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
