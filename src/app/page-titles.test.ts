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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { metadata as overviewMetadata }   from "./dashboard/(overview)/layout";
import { metadata as historyMetadata }    from "./dashboard/history/layout";
import { metadata as splitsMetadata }     from "./dashboard/splits/layout";
import { metadata as qrMetadata }         from "./dashboard/qr/layout";
import { metadata as settingsMetadata }   from "./dashboard/settings/layout";
import { metadata as webhooksMetadata }   from "./dashboard/webhooks/layout";
import { metadata as onboardingMetadata } from "./onboarding/layout";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    expect(metadata.title).toBeDefined();
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title).toMatch(/ \| Novatip$/);
    expect(metadata.title).toBe(`${name} | Novatip`);
  });

  it("gives every route a distinct unique title", () => {
    const titles = ROUTES.map(([, metadata]) => metadata.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("fails when a dashboard route has no layout", () => {
    const dashboardDir = path.resolve(__dirname, "dashboard");
    const entries = fs.readdirSync(dashboardDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const routeDir = path.join(dashboardDir, entry.name);
        const hasPage = fs.existsSync(path.join(routeDir, "page.tsx"));
        if (hasPage) {
          const hasLayout = fs.existsSync(path.join(routeDir, "layout.tsx"));
          expect(hasLayout, `Dashboard route '${entry.name}' is missing a layout.tsx`).toBe(true);
        }
      }
    }
  });
});
