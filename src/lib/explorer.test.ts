/**
 * src/lib/explorer.test.ts
 *
 * Unit tests for getExplorerUrl.
 *
 * Covers:
 *   - Testnet addresses link to the testnet explorer
 *   - Mainnet addresses link to the public (mainnet) explorer
 *   - The URL structure matches stellar.expert's expected format
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getExplorerUrl } from "./explorer";

const SAMPLE_ADDRESS = "GBOUUKWI3SUIIL75NEZMVYLYU77SIXNN2RNYMNJOJX6WXOICMMAKKKB4";

// Mock config to control network value
const mockConfig = vi.hoisted(() => ({
  stellar: {
    network: "testnet" as "testnet" | "mainnet" | "local",
  },
}));

vi.mock("@/lib/config", async () => {
  const actual = await vi.importActual("@/lib/config");
  return {
    ...actual,
    config: mockConfig,
  };
});

describe("getExplorerUrl", () => {
  it("builds a testnet URL when network is testnet", () => {
    mockConfig.stellar.network = "testnet";
    const url = getExplorerUrl(SAMPLE_ADDRESS);
    expect(url).toBe(`https://stellar.expert/explorer/testnet/account/${SAMPLE_ADDRESS}`);
  });

  it("builds a public (mainnet) URL when network is mainnet", () => {
    mockConfig.stellar.network = "mainnet";
    const url = getExplorerUrl(SAMPLE_ADDRESS);
    expect(url).toBe(`https://stellar.expert/explorer/public/account/${SAMPLE_ADDRESS}`);
  });

  it("builds a local URL when network is local", () => {
    mockConfig.stellar.network = "local";
    const url = getExplorerUrl(SAMPLE_ADDRESS);
    expect(url).toBe(`https://stellar.expert/explorer/local/account/${SAMPLE_ADDRESS}`);
  });
});
