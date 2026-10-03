/**
 * src/lib/wallet.test.ts
 *
 * Unit tests for assertActiveAccount.
 *
 * Without this guard, a mismatch between the account Freighter has selected
 * and the one a transaction was built for is only discovered by the network,
 * which rejects it as an unreadable base64-encoded txBAD_AUTH. This is the
 * guard that turns that into a readable sentence before signing is even
 * attempted.
 *
 * Covers:
 *   - A matching active account passes without throwing
 *   - A mismatched active account throws, naming both the active and the
 *     expected address
 *   - The wallet declining to report an address does not block (fails open,
 *     since there is nothing to compare against)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { getAddress } from "@stellar/freighter-api";
import { assertActiveAccount } from "./wallet";

vi.mock("@stellar/freighter-api", () => ({
  getAddress:      vi.fn(),
  isConnected:     vi.fn(),
  requestAccess:   vi.fn(),
  signMessage:     vi.fn(),
  signTransaction: vi.fn(),
}));

const mockedGetAddress = vi.mocked(getAddress);

afterEach(() => {
  vi.clearAllMocks();
});

const ACTIVE   = "GACTIVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const EXPECTED = "GEXPECTEDBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

/** Mirrors the private shorten() helper in lib/wallet.ts. */
function shortened(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

describe("assertActiveAccount", () => {
  it("resolves without throwing when the active account matches", async () => {
    mockedGetAddress.mockResolvedValue({ address: EXPECTED });

    await expect(assertActiveAccount(EXPECTED)).resolves.toBeUndefined();
  });

  it("throws naming both the active and expected accounts on a mismatch", async () => {
    mockedGetAddress.mockResolvedValue({ address: ACTIVE });

    await expect(assertActiveAccount(EXPECTED)).rejects.toThrow(
      `Freighter is currently on ${shortened(ACTIVE)} but this action is for ${shortened(EXPECTED)}`,
    );
  });

  it("does not block when the wallet declines to report an address", async () => {
    mockedGetAddress.mockResolvedValue({
      address: "",
      error: { message: "User declined access" } as any,
    });

    await expect(assertActiveAccount(EXPECTED)).resolves.toBeUndefined();
  });

  it("does not block when the wallet reports no address at all", async () => {
    mockedGetAddress.mockResolvedValue({ address: "" });

    await expect(assertActiveAccount(EXPECTED)).resolves.toBeUndefined();
  });
});
