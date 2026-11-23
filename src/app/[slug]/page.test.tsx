/**
 * src/app/[slug]/page.test.tsx
 *
 * Tests for the public tip page (/@alice).
 *
 * The page is an async server component, so it is awaited and its result
 * rendered. Everything that talks to the backend or the wallet is mocked; what
 * is under test is the page's own composition.
 *
 * Covers:
 *   - The project-links footer is rendered after the main content
 *   - generateMetadata sets the canonical URL in the /alice form for both
 *     /alice and /@alice, and leaves the Open Graph URL alone
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TipPage, { generateMetadata } from "./page";

// The client build of React that vitest resolves has no cache(); a pass-through
// is enough because the page only uses it to dedupe one request.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T,>(fn: T) => fn,
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    constructor(public readonly status: number) {
      super("api error");
    }
  },
  resolverApi: {
    resolve: vi.fn().mockResolvedValue({
      creator: {
        jarId: "jar-1",
        displayName: "Alice",
        bio: null,
        avatarUrl: null,
        splits: [{ to: "GABC", bps: 10_000 }],
      },
      tipUrl: "https://novatip.example/@alice",
      qrPngUrl: "https://novatip.example/qr/alice.png",
      recentTips: [],
    }),
  },
}));

vi.mock("@/components/Header", () => ({ Header: () => <header /> }));
vi.mock("@/components/TipForm", () => ({ TipForm: () => <div data-testid="tip-form" /> }));
vi.mock("@/components/QRDownload", () => ({ QRDownload: () => <div /> }));
vi.mock("@/components/SplitBreakdown", () => ({ SplitBreakdown: () => <div /> }));
vi.mock("@/components/PublicSupportersFeed", () => ({ PublicSupportersFeed: () => <div /> }));
vi.mock("@/components/Avatar", () => ({ Avatar: () => <div /> }));

afterEach(cleanup);

describe("TipPage (/[slug])", () => {
  it("renders the project-links footer after the main content", async () => {
    render(await TipPage({ params: Promise.resolve({ slug: "alice" }) }));

    const main = screen.getByRole("main");
    const footer = screen.getByRole("contentinfo");
    expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("link", { name: /^Docs/ })).toHaveAttribute(
      "href",
      "https://novatip-docs.pages.dev",
    );
    expect(screen.getByRole("link", { name: /^Security policy/ })).toHaveAttribute(
      "href",
      "https://github.com/Novatip/novatip-docs/blob/main/SECURITY.md",
    );
  });
});

describe("generateMetadata (/[slug])", () => {
  const canonical = () => `${window.location.origin}/alice`;

  it("sets the canonical URL in the /alice form for /alice", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "alice" }) });

    expect(metadata.alternates?.canonical).toBe(canonical());
  });

  it("sets the same canonical URL for /@alice", async () => {
    const plain = await generateMetadata({ params: Promise.resolve({ slug: "alice" }) });
    const at = await generateMetadata({ params: Promise.resolve({ slug: "@alice" }) });
    const encodedAt = await generateMetadata({ params: Promise.resolve({ slug: "%40alice" }) });

    expect(at.alternates?.canonical).toBe(canonical());
    expect(encodedAt.alternates?.canonical).toBe(canonical());
    expect(at.alternates?.canonical).toBe(plain.alternates?.canonical);
  });

  it("leaves the Open Graph URL as the backend's tipUrl", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "@alice" }) });

    expect(metadata.openGraph?.url).toBe("https://novatip.example/@alice");
  });
});
