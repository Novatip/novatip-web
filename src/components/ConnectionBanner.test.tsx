/**
 * src/components/ConnectionBanner.test.tsx
 *
 * Unit tests for ConnectionBanner.
 *
 * Covers:
 *   - Renders nothing while the backend is reachable (the default)
 *   - Shows the status message after a connection failure is emitted
 *   - Hides again after a success is emitted
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { emitConnectionFailure, emitConnectionSuccess } from "@/lib/connectionEvents";
import { ConnectionBanner } from "./ConnectionBanner";

function renderBanner() {
  return render(
    <ConnectionProvider>
      <ConnectionBanner />
    </ConnectionProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("ConnectionBanner", () => {
  it("renders nothing by default", () => {
    renderBanner();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the status message after a connection failure", () => {
    renderBanner();

    act(() => emitConnectionFailure());

    expect(screen.getByRole("status")).toHaveTextContent(/connecting to the server/i);
  });

  it("hides again after a connection success", () => {
    renderBanner();
    act(() => emitConnectionFailure());
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => emitConnectionSuccess());

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
