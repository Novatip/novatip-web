/**
 * src/lib/wallet.test.ts
 *
 * Unit tests for assertActiveAccount and signNonce.
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
 *   - signNonce converts a base64 signature to hex
 *   - signNonce hex-encodes a byte-array signature (freighter-api v3)
 *   - signNonce throws the wallet's error, or a fallback, on an error result
 *   - signNonce throws when the wallet returns no signature
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { getAddress, signMessage } from "@stellar/freighter-api";
import { assertActiveAccount, signNonce } from "./wallet";

vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signMessage: vi.fn(),
  signTransaction: vi.fn(),
}));

const mockedGetAddress = vi.mocked(getAddress);
const mockedSignMessage = vi.mocked(signMessage);

afterEach(() => {
  vi.clearAllMocks();
});

const ACTIVE = "GACTIVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
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
      error: { message: "User declined access" } as unknown as string,
    });

    await expect(assertActiveAccount(EXPECTED)).resolves.toBeUndefined();
  });

  it("does not block when the wallet reports no address at all", async () => {
    mockedGetAddress.mockResolvedValue({ address: "" });

    await expect(assertActiveAccount(EXPECTED)).resolves.toBeUndefined();
  });
});

describe("signNonce", () => {
  it("converts a base64 signature to hex", async () => {
    // base64 "AQID/w==" decodes to the bytes 01 02 03 ff
    mockedSignMessage.mockResolvedValue({ signedMessage: "AQID/w==", signerAddress: ACTIVE });

    await expect(signNonce("nonce-1", ACTIVE)).resolves.toBe("010203ff");
    expect(mockedSignMessage).toHaveBeenCalledWith("nonce-1", { address: ACTIVE });
  });

  it("zero-pads single-digit bytes when converting base64", async () => {
    // base64 "AAEC" decodes to 00 01 02
    mockedSignMessage.mockResolvedValue({ signedMessage: "AAEC", signerAddress: ACTIVE });

    await expect(signNonce("nonce-1", ACTIVE)).resolves.toBe("000102");
  });

  it("hex-encodes a byte-array signature", async () => {
    mockedSignMessage.mockResolvedValue({
      signedMessage: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
      signerAddress: ACTIVE,
    });

    await expect(signNonce("nonce-1", ACTIVE)).resolves.toBe("deadbeef");
  });

  it("throws the wallet's message when it returns an error", async () => {
    mockedSignMessage.mockResolvedValue({
      signedMessage: null,
      signerAddress: "",
      error: { message: "User declined access" } as unknown as string,
    });

    await expect(signNonce("nonce-1", ACTIVE)).rejects.toThrow("User declined access");
  });

  it("falls back to a generic message when the error has no readable text", async () => {
    mockedSignMessage.mockResolvedValue({
      signedMessage: null,
      signerAddress: "",
      error: {} as unknown as string,
    });

    await expect(signNonce("nonce-1", ACTIVE)).rejects.toThrow("Message signing failed.");
  });

  it("throws when the wallet returns no signature", async () => {
    mockedSignMessage.mockResolvedValue({ signedMessage: null, signerAddress: ACTIVE });
    await expect(signNonce("nonce-1", ACTIVE)).rejects.toThrow(
      "Wallet did not return a signature.",
    );
  });
});
