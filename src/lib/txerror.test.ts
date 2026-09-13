/**
 * txerror.test.ts
 *
 * The reference string here is the real failure a creator hit while
 * registering a jar. It decodes to txBAD_AUTH: the wallet signed with a
 * different account than the transaction's source.
 */

import { describe, it, expect } from "vitest";
import { decodeResultCode, describeSubmissionError } from "./txerror";

const BAD_AUTH_XDR = "AAAAAAAA+QT////6AAAAAA==";

describe("decodeResultCode", () => {
  it("decodes the reported failure as txBAD_AUTH", () => {
    expect(decodeResultCode(BAD_AUTH_XDR)).toBe("txBadAuth");
  });

  it("returns null for a string that is not a TransactionResult", () => {
    expect(decodeResultCode("not-xdr")).toBeNull();
  });
});

describe("describeSubmissionError", () => {
  it("replaces the raw XDR with an actionable message", async () => {
    await expect(
      describeSubmissionError(
        Promise.reject(new Error(`Transaction submission failed: ${BAD_AUTH_XDR}`)),
      ),
    ).rejects.toThrow(/different account|Switch Freighter/);
  });

  it("leaves unrelated errors alone", async () => {
    await expect(
      describeSubmissionError(Promise.reject(new Error("RPC unreachable"))),
    ).rejects.toThrow("RPC unreachable");
  });

  it("passes a successful call straight through", async () => {
    await expect(describeSubmissionError(Promise.resolve("ok"))).resolves.toBe("ok");
  });
});
