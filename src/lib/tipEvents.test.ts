/**
 * src/lib/tipEvents.test.ts
 *
 * Unit tests for the tipEvents pub/sub bus.
 *
 * Covers:
 *   - A subscribed listener receives the emitted payload
 *   - Multiple listeners all receive the same emitted payload
 *   - unsubscribe stops a listener from being called
 *   - A throwing listener does not stop later listeners from running
 *   - A throwing listener's error is reported, not silently dropped
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { tipEvents, type TipSuccessPayload } from "./tipEvents";

const PAYLOAD: TipSuccessPayload = {
  fromAddress: "GABC1234",
  amount:      "5",
  message:     "nice work",
  slug:        "ada",
};

describe("tipEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delivers the payload to a subscribed listener", () => {
    const listener = vi.fn();
    const unsub = tipEvents.subscribe(listener);

    tipEvents.emit(PAYLOAD);

    expect(listener).toHaveBeenCalledWith(PAYLOAD);
    unsub();
  });

  it("delivers the payload to every subscribed listener", () => {
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = tipEvents.subscribe(a);
    const unsubB = tipEvents.subscribe(b);

    tipEvents.emit(PAYLOAD);

    expect(a).toHaveBeenCalledWith(PAYLOAD);
    expect(b).toHaveBeenCalledWith(PAYLOAD);
    unsubA();
    unsubB();
  });

  it("stops notifying a listener once it has unsubscribed", () => {
    const listener = vi.fn();
    const unsub = tipEvents.subscribe(listener);
    unsub();

    tipEvents.emit(PAYLOAD);

    expect(listener).not.toHaveBeenCalled();
  });

  it("still calls later listeners when an earlier one throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const throwing = vi.fn(() => {
      throw new Error("boom");
    });
    const after = vi.fn();
    const unsubThrowing = tipEvents.subscribe(throwing);
    const unsubAfter = tipEvents.subscribe(after);

    expect(() => tipEvents.emit(PAYLOAD)).not.toThrow();

    expect(throwing).toHaveBeenCalledWith(PAYLOAD);
    expect(after).toHaveBeenCalledWith(PAYLOAD);
    unsubThrowing();
    unsubAfter();
  });

  it("reports a throwing listener's error instead of dropping it silently", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");
    const throwing = vi.fn(() => {
      throw err;
    });
    const unsub = tipEvents.subscribe(throwing);

    tipEvents.emit(PAYLOAD);

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("tipEvents"), err);
    unsub();
  });

  it("does not throw when emitting with no listeners", () => {
    expect(() => tipEvents.emit(PAYLOAD)).not.toThrow();
  });

  it("is safe to unsubscribe the same listener twice", () => {
    const listener = vi.fn();
    const unsubscribe = tipEvents.subscribe(listener);

    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();

    tipEvents.emit(PAYLOAD);
    expect(listener).not.toHaveBeenCalled();
  });
});
