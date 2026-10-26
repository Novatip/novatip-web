/**
 * src/lib/connectionEvents.test.ts
 *
 * Unit tests for the pub/sub bus that ConnectionProvider uses to learn about
 * backend reachability from the API client.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  onConnectionFailure,
  onConnectionSuccess,
  emitConnectionFailure,
  emitConnectionSuccess,
} from "./connectionEvents";

describe("connectionEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("notifies failure and success listeners independently", () => {
    const onFail = vi.fn();
    const onOk = vi.fn();
    const offFail = onConnectionFailure(onFail);
    const offOk = onConnectionSuccess(onOk);

    emitConnectionFailure();
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onOk).not.toHaveBeenCalled();

    emitConnectionSuccess();
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(onFail).toHaveBeenCalledTimes(1);

    offFail();
    offOk();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const off = onConnectionFailure(listener);
    off();
    emitConnectionFailure();
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps notifying other listeners when one throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = vi.fn(() => { throw new Error("boom"); });
    const good = vi.fn();
    const offBad = onConnectionFailure(bad);
    const offGood = onConnectionFailure(good);

    emitConnectionFailure();
    expect(good).toHaveBeenCalledTimes(1);

    offBad();
    offGood();
  });
});
