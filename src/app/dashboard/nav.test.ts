/**
 * src/app/dashboard/nav.test.ts
 *
 * Dashboard nav entries and page routes must match, so every dashboard page
 * is reachable from the signed-in shell and every link resolves to a page.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { NAV_ITEMS } from "./nav";

const APP_DIR = join(__dirname, "..");

/**
 * Find the page file for a route directory.
 *
 * A route group — e.g. app/dashboard/(overview)/page.tsx — contributes to the
 * same URL without appearing in it, which is how the dashboard index gained a
 * server layout for its title while its page stayed a client component.
 * A missing directory is simply "no page" rather than a readdir throw.
 */
function pageFor(routeDir: string): string | undefined {
  if (!existsSync(routeDir)) return undefined;

  const direct = join(routeDir, "page.tsx");
  if (existsSync(direct)) return direct;

  for (const entry of readdirSync(routeDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("(")) continue;
    const grouped = join(routeDir, entry.name, "page.tsx");
    if (existsSync(grouped)) return grouped;
  }

  return undefined;
}

/** Route groups contribute pages without adding a segment to the URL. */
function dashboardPageRoutes(routeDir: string, href = "/dashboard"): string[] {
  const routes = existsSync(join(routeDir, "page.tsx")) ? [href] : [];

  for (const entry of readdirSync(routeDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const segment = entry.name.startsWith("(") && entry.name.endsWith(")")
      ? ""
      : `/${entry.name}`;
    routes.push(...dashboardPageRoutes(join(routeDir, entry.name), `${href}${segment}`));
  }

  return routes;
}

describe("dashboard NAV_ITEMS", () => {
  it.each(NAV_ITEMS.map((item) => [item.label, item.href]))(
    "%s (%s) has a page",
    (_label, href) => {
      const routeDir = join(APP_DIR, ...href.split("/").filter(Boolean));
      expect(pageFor(routeDir)).toBeDefined();
    },
  );

  it("has unique hrefs", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("links to every dashboard page", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    for (const route of dashboardPageRoutes(join(APP_DIR, "dashboard"))) {
      expect(hrefs).toContain(route);
    }
  });
});
