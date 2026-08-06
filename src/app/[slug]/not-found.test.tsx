/**
 * src/app/[slug]/not-found.test.tsx
 *
 * Unit tests for the unknown-creator 404 and the page logic that reaches it.
 *
 * The distinction under test is the one that matters operationally: a 404 from
 * the resolver means the slug is unclaimed, while a 500 or a timeout means the
 * backend is having a bad day.  Showing "no tip jar here" for the second kind
 * would tell a visitor a creator does not exist when they do.
 *
 * Covers:
 *   - The 404 page is branded and routes back to the homepage
 *   - An unclaimed slug triggers notFound()
 *   - A backend fault is rethrown for the error boundary instead
 *   - A leading @ is stripped before the lookup
 *   - Metadata reflects the creator, or the failure
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ApiError } from "@/lib/api";
import CreatorNotFound from "./not-found";
import TipPage, { generateMetadata } from "./page";

vi.mock("@/components/Header", () => ({
  Header: () => <header data-testid="header" />,
}));

// TipForm reaches the wallet singleton, which constructs a Freighter adapter at
// import time. None of that is under test here.
vi.mock("@/components/TipForm", () => ({
  TipForm: () => <form data-testid="tip-form" />,
}));

// notFound() throws a sentinel in Next; reproduce that shape so the tests can
// tell "bailed out to the 404 boundary" apart from "threw for the error one".
const NOT_FOUND = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
}));

const resolve = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  resolverApi: { resolve },
}));

function creatorPayload() {
  return {
    creator: {
      id: "c1", slug: "alice", displayName: "Alice", bio: "Street violinist",
      avatarUrl: null, jarId: "jar1", splits: [{ to: "GABC", bps: 10_000 }],
      createdAt: "2026-01-01T00:00:00Z",
    },
    tipUrl:   "https://novatip.xyz/alice",
    qrSvgUrl: "https://novatip.xyz/qr/alice.svg",
    qrPngUrl: "https://novatip.xyz/qr/alice.png",
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── The page itself ───────────────────────────────────────────────────────────

describe("app/[slug]/not-found", () => {
  it("renders a branded 404 for an unknown creator", () => {
    render(<CreatorNotFound />);

    expect(
      screen.getByRole("heading", { name: /no tip jar here/i }),
    ).toBeInTheDocument();
  });

  it("routes the visitor back to the homepage", () => {
    render(<CreatorNotFound />);

    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });

  it("offers the slug to whoever wants to claim it", () => {
    render(<CreatorNotFound />);

    expect(screen.getByRole("link", { name: /claim this name/i })).toHaveAttribute(
      "href",
      "/onboarding",
    );
  });

  it("says nothing that blames the visitor for a broken link", () => {
    render(<CreatorNotFound />);

    expect(screen.getByText(/mistype/i)).toBeInTheDocument();
  });
});

// ── Reaching it ───────────────────────────────────────────────────────────────

describe("app/[slug]/page – choosing a boundary", () => {
  it("bails out to the 404 boundary when the slug is unclaimed", async () => {
    resolve.mockRejectedValue(new ApiError(404, "NOT_FOUND", "No such creator"));

    await expect(TipPage({ params: { slug: "nobody" } })).rejects.toBe(NOT_FOUND);
  });

  it("rethrows a backend fault so the error boundary handles it", async () => {
    const fault = new ApiError(500, "INTERNAL", "backend on fire");
    resolve.mockRejectedValue(fault);

    await expect(TipPage({ params: { slug: "alice" } })).rejects.toBe(fault);
  });

  it("rethrows a timeout rather than calling the creator missing", async () => {
    const timeout = new ApiError(408, "TIMEOUT", "Request timed out");
    resolve.mockRejectedValue(timeout);

    await expect(TipPage({ params: { slug: "alice" } })).rejects.toBe(timeout);
  });

  it("rethrows a plain network error too", async () => {
    const offline = new TypeError("fetch failed");
    resolve.mockRejectedValue(offline);

    await expect(TipPage({ params: { slug: "alice" } })).rejects.toBe(offline);
  });

  it("strips a leading @ before looking the creator up", async () => {
    resolve.mockResolvedValue(creatorPayload());

    await TipPage({ params: { slug: "%40alice" } });

    expect(resolve).toHaveBeenCalledWith("alice");
  });
});

// ── Metadata ──────────────────────────────────────────────────────────────────

describe("app/[slug]/page – metadata", () => {
  it("describes the creator when the lookup succeeds", async () => {
    resolve.mockResolvedValue(creatorPayload());

    await expect(generateMetadata({ params: { slug: "alice" } })).resolves.toEqual({
      title:       "Tip Alice on Novatip",
      description: "Street violinist",
    });
  });

  it("bails out so a dead link is not titled as a live page", async () => {
    resolve.mockRejectedValue(new ApiError(404, "NOT_FOUND", "No such creator"));

    await expect(
      generateMetadata({ params: { slug: "nobody" } }),
    ).rejects.toBe(NOT_FOUND);
  });

  it("stays generic — and does not 404 — on a backend fault", async () => {
    resolve.mockRejectedValue(new ApiError(500, "INTERNAL", "backend on fire"));

    await expect(generateMetadata({ params: { slug: "alice" } })).resolves.toEqual({
      title: "Novatip",
    });
  });
});
