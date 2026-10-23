/**
 * src/contexts/ConnectionContext.test.tsx
 *
 * Behavioural tests for the connectivity flag other code will rely on once
 * the "backend unreachable" banner is wired up.
 *
 * Covers:
 *   - reportError sets the flag and reportSuccess clears it
 *   - useConnection throws when used outside a ConnectionProvider
 *   - The reporters keep a stable identity across renders, since effects
 *     elsewhere subscribe to them by reference
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectionProvider, useConnection } from "./ConnectionContext";

/** Renders the public surface of the context through the hook, not the provider's state. */
function ConnectionProbe() {
  const { isBackendUnreachable, reportError, reportSuccess } = useConnection();

  return (
    <>
      <output data-testid="unreachable">{String(isBackendUnreachable)}</output>
      <button onClick={reportError}>Report error</button>
      <button onClick={reportSuccess}>Report success</button>
    </>
  );
}

afterEach(() => {
  cleanup();
});

describe("ConnectionContext – flag", () => {
  it("sets isBackendUnreachable on reportError and clears it on reportSuccess", async () => {
    render(
      <ConnectionProvider>
        <ConnectionProbe />
      </ConnectionProvider>,
    );

    expect(screen.getByTestId("unreachable")).toHaveTextContent("false");

    await userEvent.click(screen.getByRole("button", { name: "Report error" }));
    expect(screen.getByTestId("unreachable")).toHaveTextContent("true");

    await userEvent.click(screen.getByRole("button", { name: "Report success" }));
    expect(screen.getByTestId("unreachable")).toHaveTextContent("false");
  });
});

describe("ConnectionContext – outside a provider", () => {
  it("throws when useConnection is called without a ConnectionProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    function Orphan() {
      useConnection();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow(
      "useConnection must be used within a ConnectionProvider",
    );
  });
});

describe("ConnectionContext – reporter identity", () => {
  it("keeps reportError and reportSuccess stable across renders", () => {
    const seen: Array<() => void> = [];

    function IdentityProbe() {
      const { reportError } = useConnection();
      seen.push(reportError);
      return null;
    }

    const { rerender } = render(
      <ConnectionProvider>
        <IdentityProbe />
      </ConnectionProvider>,
    );
    rerender(
      <ConnectionProvider>
        <IdentityProbe />
      </ConnectionProvider>,
    );

    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
  });
});
