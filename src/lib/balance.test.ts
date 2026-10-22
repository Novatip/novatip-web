/**
 * lib/balance.test.ts
 *
 * Unit tests for getUsdcBalance.
 *
 * The reader is deliberately thin: build a read-only `balance` call against
 * the USDC asset contract, simulate it, and hand back the return value. What
 * matters to callers (TipForm) is the contract this file pins down:
 *
 *   - a successful simulation resolves with the balance as a bigint, no
 *     formatting or rounding on the way through
 *   - a simulated failure and a simulation with no result both reject with the
 *     same documented message, because TipForm distinguishes "unknown balance"
 *     from "zero balance" by catching that throw
 *
 * The Stellar SDK and the two network helpers are mocked at the module
 * boundary rather than mocked internally: this is a test of the wiring (which
 * address is queried, which contract method is called, what the result is
 * unwrapped to), not of Soroban itself.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUsdcBalance } from "./balance";

const ADDRESS = "GD7UXR3IX276M2M4XUE3TPNKTA7PJTERTEDEGWELQQYQBBHDL2NTREFR";

/** The shape getNetworkConfig() returns; the reader must pass it through untouched. */
const NETWORK = {
  name: "testnet",
  passphrase: "Test SDF Network ; September 2015",
};

/** The envelope the builder returns and the server is asked to simulate. */
const TRANSACTION = { toXDR: () => "unenveloped-xdr" };

/** Whatever the simulation hands back as the contract's return value. */
const RETVAL = { switch: () => 0 };

const server = { simulateTransaction: vi.fn() };

const deps = vi.hoisted(() => ({
  getNetworkConfig: vi.fn(),
  createRpcServer: vi.fn(),
  buildTransactionBuilder: vi.fn(),
  addOperation: vi.fn(),
  build: vi.fn(),
  contractCall: vi.fn(),
  nativeToScVal: vi.fn(),
  scValToNative: vi.fn(),
  isSimulationError: vi.fn(),
}));

vi.mock("./config", () => ({
  config: {
    stellar: {
      usdcContractId:
        "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    },
  },
}));

vi.mock("./wallet", () => ({
  getNetworkConfig: deps.getNetworkConfig,
}));

vi.mock("@novatip/sdk", () => ({
  buildTransactionBuilder: deps.buildTransactionBuilder,
  createRpcServer: deps.createRpcServer,
}));

vi.mock("@stellar/stellar-sdk", () => ({
  Contract: class {
    call(...args: unknown[]) {
      return deps.contractCall(...args);
    }
  },
  nativeToScVal: deps.nativeToScVal,
  scValToNative: deps.scValToNative,
  rpc: { Api: { isSimulationError: deps.isSimulationError } },
}));

beforeEach(() => {
  vi.clearAllMocks();

  deps.getNetworkConfig.mockReturnValue(NETWORK);
  deps.createRpcServer.mockReturnValue(server);

  // builder.addOperation(...).build()
  deps.build.mockReturnValue(TRANSACTION);
  deps.addOperation.mockReturnValue({ build: deps.build });
  deps.buildTransactionBuilder.mockResolvedValue({
    addOperation: deps.addOperation,
  });

  deps.nativeToScVal.mockReturnValue("address-scval");
  deps.contractCall.mockReturnValue("balance-invocation");
});

describe("getUsdcBalance", () => {
  it("returns the simulated balance as a bigint", async () => {
    deps.isSimulationError.mockReturnValue(false);
    server.simulateTransaction.mockResolvedValue({
      result: { retval: RETVAL },
    });
    deps.scValToNative.mockReturnValue(25_000_000n);

    await expect(getUsdcBalance(ADDRESS)).resolves.toBe(25_000_000n);

    // The probe is built for, and simulated against, the account being read —
    // the address doubles as the read-only source account.
    expect(deps.getNetworkConfig).toHaveBeenCalledTimes(1);
    expect(deps.createRpcServer).toHaveBeenCalledWith(NETWORK);
    expect(deps.buildTransactionBuilder).toHaveBeenCalledWith(
      ADDRESS,
      NETWORK,
      server,
    );

    expect(deps.nativeToScVal).toHaveBeenCalledWith(ADDRESS, {
      type: "address",
    });
    expect(deps.contractCall).toHaveBeenCalledWith("balance", "address-scval");
    expect(deps.addOperation).toHaveBeenCalledWith("balance-invocation");
    expect(deps.build).toHaveBeenCalledTimes(1);
    expect(server.simulateTransaction).toHaveBeenCalledWith(TRANSACTION);

    // It is the raw stroop amount that comes back — callers do the formatting.
    expect(deps.scValToNative).toHaveBeenCalledWith(RETVAL);
  });

  it("throws the documented message when the simulation fails", async () => {
    deps.isSimulationError.mockReturnValue(true);
    server.simulateTransaction.mockResolvedValue({
      error: "HostError: Error(Contract, #10)",
    });

    await expect(getUsdcBalance(ADDRESS)).rejects.toThrow(
      "Could not read USDC balance.",
    );

    // Nothing is unwrapped from a failed simulation, not even a stale retval.
    expect(deps.scValToNative).not.toHaveBeenCalled();
  });

  it("throws the documented message when the simulation returns no result", async () => {
    deps.isSimulationError.mockReturnValue(false);
    server.simulateTransaction.mockResolvedValue({});

    await expect(getUsdcBalance(ADDRESS)).rejects.toThrow(
      "Could not read USDC balance.",
    );

    expect(deps.scValToNative).not.toHaveBeenCalled();
  });
});
