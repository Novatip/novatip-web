/**
 * src/app/dashboard/nav.test.ts
 *
 * Every dashboard nav entry must resolve to a route with a page.tsx, so no
 * link in the signed-in shell lands on the not-found page.
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NAV_ITEMS } from "./nav";

const APP_DIR = join(__dirname, "..");

describe("dashboard NAV_ITEMS", () => {
  it.each(NAV_ITEMS.map((item) => [item.label, item.href]))(
    "%s (%s) has a page",
    (_label, href) => {
      const page = join(APP_DIR, ...href.split("/").filter(Boolean), "page.tsx");
      expect(existsSync(page)).toBe(true);
    },
  );

  it("has unique hrefs", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
