import { describe, expect, it } from "vitest";
import { isValidHttpsUrl } from "./page";

describe("webhook endpoint validation", () => {
  it("accepts HTTPS endpoints and rejects insecure or malformed URLs", () => {
    expect(isValidHttpsUrl("https://hooks.example.test/novatip")).toBe(true);
    expect(isValidHttpsUrl("http://hooks.example.test")).toBe(false);
    expect(isValidHttpsUrl("not a url")).toBe(false);
  });
});
