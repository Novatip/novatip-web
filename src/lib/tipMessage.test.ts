// @vitest-environment node

import { describe, expect, it } from "vitest";
import { MAX_MESSAGE_BYTES, utf8ByteLength } from "./tipMessage";

describe("utf8ByteLength", () => {
  it.each(["a", "Hello, world!", "123 456"])(
    "counts one byte per ASCII character in %s",
    (message) => {
      expect(utf8ByteLength(message)).toBe(message.length);
    },
  );

  it("counts an accented letter as two bytes", () => {
    expect(utf8ByteLength("é")).toBe(2);
  });

  it("counts an emoji as four bytes", () => {
    expect(utf8ByteLength("🎉")).toBe(4);
  });

  it("counts bytes in a message with mixed characters", () => {
    expect(utf8ByteLength("Hi é🎉")).toBe(9);
  });

  it("returns zero for an empty string", () => {
    expect(utf8ByteLength("")).toBe(0);
  });
});

describe("MAX_MESSAGE_BYTES", () => {
  it("matches the contract's 280-byte limit", () => {
    expect(MAX_MESSAGE_BYTES).toBe(280);
  });
});
