/**
 * src/components/JarStatusBanner.test.tsx
 *
 * Unit tests for JarStatusBanner.
 *
 * Covers:
 *   - Renders nothing while the on-chain check is in flight
 *   - Shows a registered indicator once the jar is found on-chain
 *   - Warns with an explanation and a fix link when the jar is missing
 *   - Renders nothing — and does not throw — when the check itself fails
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { JarStatusBanner } from "./JarStatusBanner";
import { readJar } from "@/lib/jar";

vi.mock("@/lib/jar", () => ({ readJar: vi.fn() }));

const mockedReadJar = vi.mocked(readJar);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("JarStatusBanner", () => {
  it("renders nothing while the check is in flight", () => {
    mockedReadJar.mockReturnValue(new Promise(() => {}));
    const { container } = render(<JarStatusBanner jarId="@ada" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a registered indicator once the jar is found on-chain", async () => {
    mockedReadJar.mockResolvedValue({ owner: "GABC", splits: [{ to: "GABC", bps: 10_000 }] });
    render(<JarStatusBanner jarId="@ada" />);

    await waitFor(() => expect(screen.getByText(/registered on-chain/i)).toBeInTheDocument());
    expect(mockedReadJar).toHaveBeenCalledWith("@ada");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("warns with an explanation and a fix link when the jar is missing", async () => {
    mockedReadJar.mockResolvedValue(null);
    render(<JarStatusBanner jarId="@ada" />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/isn.t registered on-chain yet/i)).toBeInTheDocument();
    expect(screen.getByText(/tips to your link will fail/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to splits/i })).toHaveAttribute(
      "href",
      "/dashboard/splits",
    );
  });

  it("renders nothing when the check itself fails, rather than a false alarm", async () => {
    mockedReadJar.mockRejectedValue(new Error("RPC unreachable"));
    const { container } = render(<JarStatusBanner jarId="@ada" />);

    await waitFor(() => expect(mockedReadJar).toHaveBeenCalled());
    // Let the rejected promise's .catch handler settle.
    await new Promise((r) => setTimeout(r, 0));

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("re-checks when the jarId prop changes", async () => {
    mockedReadJar.mockResolvedValue(null);
    const { rerender } = render(<JarStatusBanner jarId="@ada" />);
    await waitFor(() => expect(mockedReadJar).toHaveBeenCalledWith("@ada"));

    mockedReadJar.mockResolvedValue({ owner: "GABC", splits: [] });
    rerender(<JarStatusBanner jarId="@bob" />);

    await waitFor(() => expect(mockedReadJar).toHaveBeenCalledWith("@bob"));
    await waitFor(() => expect(screen.getByText(/registered on-chain/i)).toBeInTheDocument());
  });
});
