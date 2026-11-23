/**
 * txerror.test.ts
 *
 * The reference string here is the real failure a creator hit while
 * registering a jar. It decodes to txBAD_AUTH: the wallet signed with a
 * different account than the transaction's source.
 */

import { describe, it, expect } from "vitest";
import { decodeFailedOperationCode, decodeResultCode, describeSubmissionError } from "./txerror";

const BAD_AUTH_XDR = "AAAAAAAA+QT////6AAAAAA==";

// txFAILED wrapping a single payment operation that returned PAYMENT_UNDERFUNDED.
const PAYMENT_UNDERFUNDED_XDR = "AAAAAAAAAGT/////AAAAAQAAAAAAAAAB/////gAAAAA=";

describe("decodeResultCode", () => {
  it("decodes the reported failure as txBAD_AUTH", () => {
    expect(decodeResultCode(BAD_AUTH_XDR)).toBe("txBadAuth");
  });

  it("returns null for a string that is not a TransactionResult", () => {
    expect(decodeResultCode("not-xdr")).toBeNull();
  });
});

describe("decodeFailedOperationCode", () => {
  it("returns the first failed operation's code from a txFAILED result", () => {
    expect(decodeResultCode(PAYMENT_UNDERFUNDED_XDR)).toBe("txFailed");
    expect(decodeFailedOperationCode(PAYMENT_UNDERFUNDED_XDR)).toBe("paymentUnderfunded");
  });

  it("returns null when the result has no operation detail", () => {
    expect(decodeFailedOperationCode(BAD_AUTH_XDR)).toBeNull();
  });

  it("returns null for a string that is not a TransactionResult", () => {
    expect(decodeFailedOperationCode("not-xdr")).toBeNull();
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

  it("names the failed operation when a transaction returns txFAILED", async () => {
    await expect(
      describeSubmissionError(
        Promise.reject(new Error(`Transaction submission failed: ${PAYMENT_UNDERFUNDED_XDR}`)),
      ),
    ).rejects.toThrow(/txFAILED\): paymentUnderfunded/);
  });

  it("keeps the generic txFAILED text when there is no operation detail", async () => {
    await expect(
      describeSubmissionError(
        Promise.reject(new Error(`Transaction submission failed: ${BAD_AUTH_XDR}`)),
      ),
    ).rejects.toThrow(/\(txBAD_AUTH\)/);
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
