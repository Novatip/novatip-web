import { describe, it, expect } from "vitest";
import { describeContractError } from "./contractErrors";

describe("describeContractError", () => {
  it("translates a mapped code", () => {
    const raw = "HostError: Error(Contract, #33)\n\nEvent log (newest first): ...";
    expect(describeContractError(raw)).toMatch(/paused/i);
  });

  it("keeps the original text for an unmapped code", () => {
    const raw = "HostError: Error(Contract, #27)";
    expect(describeContractError(raw)).toBe(raw);
  });
});
