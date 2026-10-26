/**
 * src/lib/slug.test.ts
 *
 * Covers SLUG_REGEX and isValidSlug — the single source of truth for the
 * slug format used by both onboarding and the settings rename flow.
 *
 * Covers:
 *   - Valid slugs: minimum length, maximum length, all allowed characters
 *   - Invalid slugs: too short, too long, disallowed characters, empty
 */

import { describe, it, expect } from "vitest";
import { SLUG_REGEX, isValidSlug } from "./slug";

describe("isValidSlug – valid slugs", () => {
  it("accepts a minimal 3-character slug", () => {
    expect(isValidSlug("abc")).toBe(true);
  });

  it("accepts a maximum 32-character slug", () => {
    expect(isValidSlug("a".repeat(32))).toBe(true);
  });

  it("accepts lowercase letters", () => {
    expect(isValidSlug("helloworld")).toBe(true);
  });

  it("accepts digits", () => {
    expect(isValidSlug("abc123")).toBe(true);
  });

  it("accepts hyphens", () => {
    expect(isValidSlug("hello-world")).toBe(true);
  });

  it("accepts underscores", () => {
    expect(isValidSlug("hello_world")).toBe(true);
  });

  it("accepts a mix of all allowed characters", () => {
    expect(isValidSlug("my_tip-page-99")).toBe(true);
  });
});

describe("isValidSlug – invalid slugs", () => {
  it("rejects an empty string", () => {
    expect(isValidSlug("")).toBe(false);
  });

  it("rejects a slug shorter than 3 characters", () => {
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("a")).toBe(false);
  });

  it("rejects a slug longer than 32 characters", () => {
    expect(isValidSlug("a".repeat(33))).toBe(false);
  });

  it("rejects uppercase letters", () => {
    expect(isValidSlug("Hello")).toBe(false);
    expect(isValidSlug("HELLO")).toBe(false);
  });

  it("rejects spaces", () => {
    expect(isValidSlug("hello world")).toBe(false);
  });

  it("rejects the @ prefix (that belongs to jar ids, not slugs)", () => {
    expect(isValidSlug("@alice")).toBe(false);
  });

  it("rejects special characters beyond hyphen and underscore", () => {
    expect(isValidSlug("hello.world")).toBe(false);
    expect(isValidSlug("hello/world")).toBe(false);
    expect(isValidSlug("hello+world")).toBe(false);
  });
});

describe("SLUG_REGEX", () => {
  it("is the same rule isValidSlug uses", () => {
    const slug = "valid-slug_99";
    expect(SLUG_REGEX.test(slug)).toBe(isValidSlug(slug));
  });
});
