/**
 * src/lib/truncate.test.ts
 *
 * Covers truncateText — the bio shortening used by the Open Graph image.
 */

import { describe, it, expect } from "vitest";
import { truncateText } from "./truncate";

const hasLoneSurrogate = (s: string) =>
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);

describe("truncateText", () => {
  it("returns short text unchanged", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("returns text exactly at the limit unchanged", () => {
    expect(truncateText("a".repeat(10), 10)).toBe("a".repeat(10));
  });

  it("shortens long text and appends an ellipsis", () => {
    expect(truncateText("abcdefghij", 4)).toBe("abcd...");
  });

  it("never leaves a lone surrogate when an emoji straddles the cut", () => {
    const bio = `${"a".repeat(99)}💸 and more`;
    const out = truncateText(bio, 100);
    expect(hasLoneSurrogate(out)).toBe(false);
    expect(out).toBe(`${"a".repeat(99)}💸...`);
  });

  it("counts an emoji as one character, not two code units", () => {
    expect(truncateText("💸💸💸", 3)).toBe("💸💸💸");
  });

  it("drops trailing whitespace before the ellipsis", () => {
    expect(truncateText("abc def", 4)).toBe("abc...");
  });
});
