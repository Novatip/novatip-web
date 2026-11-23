/**
 * src/components/CollaboratorEarnings.test.tsx
 *
 * Unit tests for CollaboratorEarnings, with analyticsApi.collaborators mocked.
 *
 * Covers:
 *   - A skeleton shows while the request is in flight
 *   - The empty state shows when there are no collaborators
 *   - The error notice shows when the request fails
 *   - A list row renders per collaborator with a formatted amount
 *   - An amount that cannot be parsed renders a dash instead of crashing
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { formatUsdc, shortenAddress } from "@novatip/sdk";
import { CollaboratorEarnings } from "./CollaboratorEarnings";

const collaborators = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  analyticsApi: { collaborators },
}));

const ADDRESS_1 = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";
const ADDRESS_2 = "GZYXWVUTSRQPONMLKJIHGFEDCBA0987654321ZYXWVUTSRQPONMLKJI";

afterEach(() => {
  cleanup();
  collaborators.mockReset();
});

describe("CollaboratorEarnings", () => {
  it("shows a skeleton while loading, without the empty state or list", () => {
    collaborators.mockReturnValue(new Promise(() => {}));
    const { container } = render(<CollaboratorEarnings jwt="token" />);

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
    expect(screen.queryByText(/no collaborators yet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("fetches with the jwt", async () => {
    collaborators.mockResolvedValue({ collaborators: [] });
    render(<CollaboratorEarnings jwt="token" />);

    await screen.findByText(/no collaborators yet/i);
    expect(collaborators).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("shows the empty state when there are no collaborators", async () => {
    collaborators.mockResolvedValue({ collaborators: [] });
    const { container } = render(<CollaboratorEarnings jwt="token" />);

    expect(await screen.findByText(/no collaborators yet/i)).toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error notice when the request fails", async () => {
    collaborators.mockRejectedValue(new Error("Could not load collaborators"));
    render(<CollaboratorEarnings jwt="token" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load collaborators");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("lists each collaborator with a shortened address and formatted amount", async () => {
    collaborators.mockResolvedValue({
      collaborators: [
        { address: ADDRESS_1, totalAmountRaw: "50000000" },
        { address: ADDRESS_2, totalAmountRaw: "125000000" },
      ],
    });
    render(<CollaboratorEarnings jwt="token" />);

    const list = await screen.findByRole("list", { name: /collaborator earnings/i });
    const rows = within(list).getAllByRole("listitem");

    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(shortenAddress(ADDRESS_1))).toBeInTheDocument();
    expect(within(rows[0]).getByText(`$${formatUsdc(50000000n, 2)}`)).toBeInTheDocument();
    expect(within(rows[1]).getByText(shortenAddress(ADDRESS_2))).toBeInTheDocument();
    expect(within(rows[1]).getByText(`$${formatUsdc(125000000n, 2)}`)).toBeInTheDocument();
    expect(screen.queryByText(/no collaborators yet/i)).not.toBeInTheDocument();
  });

  it("prints a dash for an amount it cannot parse", async () => {
    collaborators.mockResolvedValue({
      collaborators: [
        { address: ADDRESS_1, totalAmountRaw: "not-a-number" },
        { address: ADDRESS_2, totalAmountRaw: "50000000" },
      ],
    });
    render(<CollaboratorEarnings jwt="token" />);

    const rows = within(await screen.findByRole("list")).getAllByRole("listitem");

    expect(within(rows[0]).getByText("—")).toBeInTheDocument();
    expect(within(rows[0]).queryByText(/\$/)).not.toBeInTheDocument();
    // A malformed row does not affect its neighbours.
    expect(within(rows[1]).getByText(`$${formatUsdc(50000000n, 2)}`)).toBeInTheDocument();
  });
});
