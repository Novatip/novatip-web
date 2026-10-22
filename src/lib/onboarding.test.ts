import { describe, expect, it } from "vitest";
import { isTempSlug } from "./onboarding";

// Backend source: novatip-backend's auth.service.ts generates placeholders with
// `user_${randomBytes(4).toString("hex")}` (eight lowercase hex characters).
describe("isTempSlug", () => {
  it.each(["user_1234abcd", "user_00000000", "user_ffffffff"])(
    "recognises the placeholder %s",
    (slug) => {
      expect(isTempSlug(slug)).toBe(true);
    },
  );

  it("rejects a real slug", () => {
    expect(isTempSlug("alice")).toBe(false);
  });

  it.each(["user_1234abc", "user_1234abcde"])(
    "rejects the wrong-length placeholder %s",
    (slug) => {
      expect(isTempSlug(slug)).toBe(false);
    },
  );

  it.each(["user_1234abcg", "user_1234ab_z"])(
    "rejects non-hex characters in %s",
    (slug) => {
      expect(isTempSlug(slug)).toBe(false);
    },
  );
});
