/**
 * src/lib/pageTitle.test.ts
 *
 * Unit tests for the pageTitle helper.
 *
 * pageTitle builds the document title for dashboard and onboarding layouts.
 * It ensures that every route title follows the "<Page> | Novatip" pattern.
 *
 * The contract under test: a nested layout that exports its own metadata.title
 * replaces the root title outright (Next does not append the parent title), so
 * the brand suffix must be part of every page title. This helper enforces that.
 *
 * Covers:
 *   - Returns an object with a title property
 *   - Appends the Novatip suffix to the provided title
 *   - Uses " | " as the separator
 *   - Works with single-word titles
 *   - Works with multi-word titles
 *   - Works with titles containing special characters
 */

import { describe, it, expect } from "vitest";
import { pageTitle } from "./pageTitle";
import type { Metadata } from "next";

describe("pageTitle", () => {
  it("returns a Metadata object", () => {
    const result = pageTitle("Overview");

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("includes a title property", () => {
    const result = pageTitle("Overview");

    expect(result).toHaveProperty("title");
  });

  it("formats the title with ' | Novatip' suffix", () => {
    const result = pageTitle("Overview");

    expect(result.title).toBe("Overview | Novatip");
  });

  it("works with single-word titles", () => {
    expect(pageTitle("Settings").title).toBe("Settings | Novatip");
  });

  it("works with multi-word titles", () => {
    expect(pageTitle("QR Code").title).toBe("QR Code | Novatip");
  });

  it("works with titles containing hyphens", () => {
    expect(pageTitle("Link-Sharing").title).toBe("Link-Sharing | Novatip");
  });

  it("preserves the exact title text provided", () => {
    const customTitle = "My Custom Page";
    expect(pageTitle(customTitle).title).toBe(`${customTitle} | Novatip`);
  });

  it("works with all dashboard route titles", () => {
    const dashboardRoutes = [
      "Overview",
      "History",
      "Splits",
      "QR Code",
      "Settings",
      "Webhooks",
    ];

    dashboardRoutes.forEach((route) => {
      const result = pageTitle(route);
      expect(result.title).toBe(`${route} | Novatip`);
    });
  });

  it("works with the onboarding title", () => {
    expect(pageTitle("Onboarding").title).toBe("Onboarding | Novatip");
  });

  it("returns the correct Metadata type", () => {
    const result = pageTitle("Test");

    // Verify it matches Metadata interface shape
    expect(result).toHaveProperty("title");
    expect(typeof result.title).toBe("string");
  });
});
