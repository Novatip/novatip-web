import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ siteUrl: "https://novatip.example" }));

vi.mock("@/lib/config", () => ({
  config: {
    get siteUrl() {
      return mocks.siteUrl;
    },
  },
}));

import sitemap from "./sitemap";

beforeEach(() => {
  mocks.siteUrl = "https://novatip.example";
});

describe("sitemap", () => {
  it("lists the home page exactly once", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls.filter((url) => url === "https://novatip.example")).toHaveLength(1);
  });

  it("leaves out the private routes", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls.some((url) => url.includes("/dashboard"))).toBe(false);
    expect(urls.some((url) => url.includes("/onboarding"))).toBe(false);
  });

  it("does not double up a trailing slash in the site URL", () => {
    mocks.siteUrl = "https://novatip.example/";

    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain("https://novatip.example");
    expect(urls.some((url) => url.includes("//", "https://".length))).toBe(false);
  });
});
