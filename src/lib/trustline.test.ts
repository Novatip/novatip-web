/**
 * trustline.test.ts
 *
 * The guard has to fail closed on a real missing trustline and fail open on a
 * flaky probe — blocking a save because the RPC blinked would be worse than
 * letting the contract reject the tip.
 */

import { describe, it, expect } from "vitest";
import { assertRecipientsCanReceive } from "./trustline";

const A = "GD7UXR3IX276M2M4XUE3TPNKTA7PJTERTEDEGWELQQYQBBHDL2NTREFR";
const B = "GCB6PYGTNPFCHUXULHSVCTITYXPUB4Y6JKW2GSJ5C2WL5CRQBY5GUBNR";

describe("assertRecipientsCanReceive", () => {
  it("passes when every recipient can be paid", async () => {
    await expect(
      assertRecipientsCanReceive([A, B], async () => true),
    ).resolves.toBeUndefined();
  });

  it("names the account that cannot receive", async () => {
    await expect(
      assertRecipientsCanReceive([A, B], async (addr) => addr !== B),
    ).rejects.toThrow(/cannot receive USDC/);
  });

  it("treats a probe that throws as inconclusive rather than blocking", async () => {
    await expect(
      assertRecipientsCanReceive([A], async () => {
        throw new Error("RPC unreachable");
      }),
    ).resolves.toBeUndefined();
  });
});
