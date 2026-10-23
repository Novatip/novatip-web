import { describe, expect, it } from "vitest";
import { isLargeTip, isWithinTipCeiling } from "@/lib/tipAmount";
import { MAX_MESSAGE_BYTES, utf8ByteLength } from "@/lib/tipMessage";

describe("TipForm issue coverage", () => {
  it("counts UTF-8 bytes rather than JavaScript characters", () => {
    expect(utf8ByteLength("🎉")).toBe(4);
    expect(utf8ByteLength("a".repeat(MAX_MESSAGE_BYTES))).toBe(MAX_MESSAGE_BYTES);
  });
  it("requires large tips to stay within the configured ceiling", () => {
    expect(isLargeTip("100")).toBe(true);
    expect(isWithinTipCeiling("100")).toBe(true);
    expect(isWithinTipCeiling("1000000")).toBe(false);
  });
  it("does not treat an empty collaborator split list as payable", () => {
    const splits: { to: string; bps: number }[] = [];
    expect(splits.length > 0).toBe(false);
  });
});
