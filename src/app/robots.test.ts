/**
 * src/app/robots.test.ts
 *
 * Covers the crawler rules and the sitemap URL built from the site URL.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ siteUrl: "https://novatip.example" }));

vi.mock("@/lib/config", () => ({
  config: {
    get siteUrl() {
      return mocks.siteUrl;
    },
  },
}));

import robots from "./robots";

beforeEach(() => {
  mocks.siteUrl = "https://novatip.example";
});

describe("robots – rules", () => {
  it("applies to every crawler and allows the site by default", () => {
    expect(robots().rules).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("keeps the dashboard and onboarding routes out of search results", () => {
    expect(robots().rules).toMatchObject({
      disallow: ["/dashboard", "/dashboard/*", "/onboarding", "/onboarding/*"],
    });
  });
});

describe("robots – sitemap", () => {
  it("points at the sitemap under the site URL", () => {
    expect(robots().sitemap).toBe("https://novatip.example/sitemap.xml");
  });

  it("does not double up a trailing slash in the site URL", () => {
    mocks.siteUrl = "https://novatip.example/";

    expect(robots().sitemap).toBe("https://novatip.example/sitemap.xml");
  });
});
