/**
 * trustline.test.ts
 *
 * The guard has to fail closed on a real missing trustline and fail open on a
 * flaky probe — blocking a save because the RPC blinked would be worse than
 * letting the contract reject the tip.
 *
 * The probe itself, canReceiveUsdc, is tested against a mocked SDK: a
 * successful simulation means the account can receive, any simulation error
 * means it cannot, and a failure to even build the transaction is not
 * swallowed — the guard above is what decides how to treat that.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { assertRecipientsCanReceive, canReceiveUsdc } from "./trustline";

const sdk = vi.hoisted(() => ({
  createRpcServer: vi.fn(),
  buildTransactionBuilder: vi.fn(),
}));

vi.mock("@novatip/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@novatip/sdk")>()),
  createRpcServer: sdk.createRpcServer,
  buildTransactionBuilder: sdk.buildTransactionBuilder,
}));

const NETWORK = { name: "test-network" };

vi.mock("./wallet", () => ({
  getNetworkConfig: () => NETWORK,
}));

// Contract() validates its id, so give it a well-formed one.
vi.mock("./config", async () => {
  const { StrKey } = await import("@stellar/stellar-sdk");
  return {
    config: { stellar: { usdcContractId: StrKey.encodeContract(Buffer.alloc(32)) } },
  };
});

const A = "GD7UXR3IX276M2M4XUE3TPNKTA7PJTERTEDEGWELQQYQBBHDL2NTREFR";
const B = "GCB6PYGTNPFCHUXULHSVCTITYXPUB4Y6JKW2GSJ5C2WL5CRQBY5GUBNR";

describe("assertRecipientsCanReceive", () => {
  it("passes when every recipient can be paid", async () => {
    await expect(assertRecipientsCanReceive([A, B], async () => true)).resolves.toBeUndefined();
  });

  it("names the account that cannot receive", async () => {
    await expect(assertRecipientsCanReceive([A, B], async (addr) => addr !== B)).rejects.toThrow(
      /cannot receive USDC/,
    );
  });

  it("treats a probe that throws as inconclusive rather than blocking", async () => {
    await expect(
      assertRecipientsCanReceive([A], async () => {
        throw new Error("RPC unreachable");
      }),
    ).resolves.toBeUndefined();
  });
});

// ── canReceiveUsdc ────────────────────────────────────────────────────────────

describe("canReceiveUsdc", () => {
  const ADDRESS = Keypair.random().publicKey();
  const BUILT_TX = { built: true };

  const server = { simulateTransaction: vi.fn() };
  const builder = {
    addOperation: vi.fn().mockReturnThis(),
    build: vi.fn(() => BUILT_TX),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sdk.createRpcServer.mockReturnValue(server);
    sdk.buildTransactionBuilder.mockResolvedValue(builder);
    builder.addOperation.mockReturnThis();
    builder.build.mockReturnValue(BUILT_TX);
  });

  it("returns true when the simulation succeeds", async () => {
    server.simulateTransaction.mockResolvedValue({ latestLedger: 1, result: { retval: null } });

    await expect(canReceiveUsdc(ADDRESS)).resolves.toBe(true);

    expect(sdk.createRpcServer).toHaveBeenCalledWith(NETWORK);
    expect(sdk.buildTransactionBuilder).toHaveBeenCalledWith(ADDRESS, NETWORK, server);
    expect(builder.addOperation).toHaveBeenCalledTimes(1);
    expect(server.simulateTransaction).toHaveBeenCalledWith(BUILT_TX);
  });

  it("returns false when the simulation reports an error", async () => {
    server.simulateTransaction.mockResolvedValue({
      latestLedger: 1,
      error: "HostError: Error(Contract, #13)",
    });

    await expect(canReceiveUsdc(ADDRESS)).resolves.toBe(false);
  });

  it("lets a builder failure propagate instead of reporting false", async () => {
    sdk.buildTransactionBuilder.mockRejectedValue(new Error("Account not found"));

    await expect(canReceiveUsdc(ADDRESS)).rejects.toThrow("Account not found");

    expect(server.simulateTransaction).not.toHaveBeenCalled();
  });
});
