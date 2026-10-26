/**
 * src/app/dashboard/qr/page.test.tsx
 *
 * Unit tests for the dashboard QR page's slug resolution.
 *
 * Covers:
 *   - A pending lookup shows the loading skeleton, not the QR code
 *   - A resolved slug renders QRDownload with the right PNG URL
 *   - A failed lookup shows an error with a retry, rather than an empty page
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QRPage from "./page";

const me = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  authApi: { me },
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({ jwt: "jwt" }),
}));

vi.mock("@/components/QRDownload", () => ({
  QRDownload: ({ slug, pngUrl }: { slug: string; pngUrl: string }) => (
    <div data-testid="qr-download" data-slug={slug} data-png-url={pngUrl} />
  ),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("QRPage – loading", () => {
  it("shows the skeleton while the slug lookup is in flight", () => {
    me.mockReturnValue(new Promise(() => {})); // never resolves

    render(<QRPage />);

    expect(screen.queryByTestId("qr-download")).not.toBeInTheDocument();
    expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument();
  });
});

describe("QRPage – loaded", () => {
  it("renders QRDownload with the creator's slug and PNG URL once resolved", async () => {
    me.mockResolvedValue({ user: { slug: "ada" } });

    render(<QRPage />);

    const qr = await screen.findByTestId("qr-download");
    expect(qr).toHaveAttribute("data-slug", "ada");
    expect(qr.getAttribute("data-png-url")).toContain("/qr/ada/png");
  });

  it("prompts onboarding instead of a blank page when there is no slug yet", async () => {
    me.mockResolvedValue({ user: { slug: null } });

    render(<QRPage />);

    expect(await screen.findByText(/complete onboarding/i)).toBeInTheDocument();
    expect(screen.queryByTestId("qr-download")).not.toBeInTheDocument();
  });
});

describe("QRPage – failed lookup", () => {
  it("shows an error with a retry instead of an empty page", async () => {
    me.mockRejectedValue(new Error("Network down"));

    render(<QRPage />);

    expect(await screen.findByText(/failed to load your qr code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByTestId("qr-download")).not.toBeInTheDocument();
  });

  it("retries the lookup when asked", async () => {
    me.mockRejectedValueOnce(new Error("Network down"));
    me.mockResolvedValueOnce({ user: { slug: "ada" } });

    render(<QRPage />);

    await screen.findByText(/failed to load your qr code/i);

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(me).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId("qr-download")).toBeInTheDocument();
  });
});
