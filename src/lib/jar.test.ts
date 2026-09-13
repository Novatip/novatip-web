/**
 * jar.test.ts
 *
 * syncJarToChain decides whether a tip can be paid at all, and to whom, so the
 * branch it picks is worth pinning. The bug it exists to prevent was silent:
 * onboarding wrote a creator row, never registered the jar, and the failure
 * only surfaced later as JarNotFound on someone else's tip.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContractErrorCode, NovatipContractError } from "@novatip/sdk";

const getJar       = vi.fn();
const createJar    = vi.fn();
const updateSplits = vi.fn();

const assertActiveAccount = vi.fn(async (_expected: string) => {});

vi.mock("./wallet", () => ({
  getTipSplitterClient: () => ({ getJar, createJar, updateSplits }),
  makeSignTransaction:  () => async (xdr: string) => xdr,
  assertActiveAccount:  (expected: string) => assertActiveAccount(expected),
}));

const { jarIdForSlug, readJar, syncJarToChain } = await import("./jar");

const OWNER = "GBOUUKWI3SUIIL75NEZMVYLYU77SIXNN2RNYMNJOJX6WXOICMMAKKKB4";
const OTHER = "GBASZB2BGT6WYIQ57PSXBNLK5PUH5W3ASRUS4DZHHHJW3YQ5ZWGASJJ5";
const SPLITS = [{ to: OWNER, bps: 10000 }];

beforeEach(() => {
  assertActiveAccount.mockReset();
  assertActiveAccount.mockResolvedValue(undefined);
  getJar.mockReset();
  createJar.mockReset();
  updateSplits.mockReset();
});

describe("jarIdForSlug", () => {
  it("prefixes the slug with @, matching the backend", () => {
    expect(jarIdForSlug("doryjar")).toBe("@doryjar");
  });
});

describe("readJar", () => {
  it("returns null for a typed JarNotFound rather than throwing", async () => {
    getJar.mockRejectedValue(
      new NovatipContractError(ContractErrorCode.JarNotFound),
    );
    await expect(readJar("@nope")).resolves.toBeNull();
  });

  it("returns null when the error is only a raw simulation message", async () => {
    getJar.mockRejectedValue(
      new Error("Simulation failed: HostError: Error(Contract, #3)"),
    );
    await expect(readJar("@nope")).resolves.toBeNull();
  });

  it("rethrows errors that are not JarNotFound", async () => {
    getJar.mockRejectedValue(new Error("RPC unreachable"));
    await expect(readJar("@nope")).rejects.toThrow("RPC unreachable");
  });
});

describe("syncJarToChain", () => {
  it("creates the jar when the contract has no record of it", async () => {
    getJar.mockRejectedValue(
      new NovatipContractError(ContractErrorCode.JarNotFound),
    );
    createJar.mockResolvedValue(undefined);

    await expect(
      syncJarToChain({ owner: OWNER, jarId: "@doryjar", splits: SPLITS }),
    ).resolves.toBe("created");

    expect(createJar).toHaveBeenCalledWith(
      { owner: OWNER, jarId: "@doryjar", splits: SPLITS },
      expect.anything(),
    );
    expect(updateSplits).not.toHaveBeenCalled();
  });

  it("updates splits when the jar exists and they differ", async () => {
    getJar.mockResolvedValue({ owner: OWNER, splits: [{ to: OWNER, bps: 5000 }] });
    updateSplits.mockResolvedValue(undefined);

    await expect(
      syncJarToChain({ owner: OWNER, jarId: "@doryjar", splits: SPLITS }),
    ).resolves.toBe("updated");

    expect(createJar).not.toHaveBeenCalled();
  });

  it("writes nothing when the chain already matches", async () => {
    getJar.mockResolvedValue({ owner: OWNER, splits: SPLITS });

    await expect(
      syncJarToChain({ owner: OWNER, jarId: "@doryjar", splits: SPLITS }),
    ).resolves.toBe("unchanged");

    expect(createJar).not.toHaveBeenCalled();
    expect(updateSplits).not.toHaveBeenCalled();
  });

  it("refuses to touch a jar owned by another wallet", async () => {
    getJar.mockResolvedValue({ owner: OTHER, splits: SPLITS });

    await expect(
      syncJarToChain({ owner: OWNER, jarId: "@doryjar", splits: SPLITS }),
    ).rejects.toThrow(/already registered to a different wallet/);

    expect(createJar).not.toHaveBeenCalled();
    expect(updateSplits).not.toHaveBeenCalled();
  });
});

describe("syncJarToChain account guard", () => {
  it("checks the active wallet account before touching the chain", async () => {
    getJar.mockRejectedValue(
      new NovatipContractError(ContractErrorCode.JarNotFound),
    );
    createJar.mockResolvedValue(undefined);

    await syncJarToChain({ owner: OWNER, jarId: "@doryjar", splits: SPLITS });

    expect(assertActiveAccount).toHaveBeenCalledWith(OWNER);
  });

  it("does not build or sign anything when the wrong account is active", async () => {
    assertActiveAccount.mockRejectedValue(new Error("Freighter is currently on GBBB…"));

    await expect(
      syncJarToChain({ owner: OWNER, jarId: "@doryjar", splits: SPLITS }),
    ).rejects.toThrow(/Freighter is currently on/);

    expect(getJar).not.toHaveBeenCalled();
    expect(createJar).not.toHaveBeenCalled();
    expect(updateSplits).not.toHaveBeenCalled();
  });
});
