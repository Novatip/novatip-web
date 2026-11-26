/**
 * src/app/page.test.tsx
 *
 * Unit tests for the home page (/).
 *
 * The home page is the entry point for every creator. It renders:
 *   - The Header component
 *   - Two call-to-action links (to onboarding and demo)
 *   - The ConnectPrompt component inside a Suspense boundary
 *   - A main content area with branding and value proposition
 *
 * Covers:
 *   - The page renders without error
 *   - The Header is rendered
 *   - The ConnectPrompt is rendered inside Suspense
 *   - "Create your tip jar" link points to /onboarding
 *   - "See a demo page" link points to NEXT_PUBLIC_DEMO_SLUG, and is hidden
 *     when the variable is unset
 *   - Both CTA links render as single interactive elements (LinkButton)
 *   - The page has accessible main content region
 *   - The heading "Tip any creator in 2 seconds" is displayed
 *   - The value proposition text is present
 *   - The project-links footer is rendered after the main content
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import HomePage from "./page";

// Mock the Header component
vi.mock("@/components/Header", () => ({
  Header: () => <header data-testid="header" />,
}));

// Mock the ConnectPrompt component
vi.mock("@/components/ConnectPrompt", () => ({
  ConnectPrompt: () => <div data-testid="connect-prompt" />,
}));

// Mock Next.js Image to avoid build issues in tests
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} data-testid={`image-${src}`} />
  ),
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DEMO_SLUG", "demo");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("HomePage (/)", () => {
  it("renders without error", () => {
    render(<HomePage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the Header component", () => {
    render(<HomePage />);

    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("renders the ConnectPrompt inside Suspense", () => {
    render(<HomePage />);

    expect(screen.getByTestId("connect-prompt")).toBeInTheDocument();
  });

  it("has an accessible main content region", () => {
    render(<HomePage />);

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabIndex", "-1");
  });

  it("renders the project-links footer after the main content", () => {
    render(<HomePage />);

    const footer = screen.getByRole("contentinfo");
    const main = screen.getByRole("main");
    expect(footer).toBeInTheDocument();
    expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("link", { name: /^GitHub/ })).toHaveAttribute(
      "href",
      "https://github.com/Novatip",
    );
  });

  // ── Heading and Value Proposition ──────────────────────────────────────────

  it("displays the main heading", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /tip any creator in/i })).toBeInTheDocument();
  });

  it("highlights '2 seconds' in the heading", () => {
    render(<HomePage />);

    const heading = screen.getByRole("heading", { name: /tip any creator in/i });
    expect(heading.querySelector(".text-gradient")).toHaveTextContent("2 seconds");
  });

  it("displays the value proposition text", () => {
    render(<HomePage />);

    expect(screen.getByText(/cross-border micro-tipping for creators/i)).toBeInTheDocument();
  });

  it("explains the tech stack in the value proposition", () => {
    render(<HomePage />);

    expect(screen.getByText(/powered by stellar usdc/i)).toBeInTheDocument();
    expect(screen.getByText(/no middlemen, no big cuts/i)).toBeInTheDocument();
  });

  // ── Call-to-Action Links ──────────────────────────────────────────────────

  it("renders 'Create your tip jar' as a link to /onboarding", () => {
    render(<HomePage />);

    const createLink = screen.getByRole("link", { name: /create your tip jar/i });
    expect(createLink).toHaveAttribute("href", "/onboarding");
  });

  it("links 'See a demo page' to NEXT_PUBLIC_DEMO_SLUG", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_SLUG", "ada-lovelace");
    render(<HomePage />);

    const demoLink = screen.getByRole("link", { name: /see a demo page/i });
    expect(demoLink).toHaveAttribute("href", "/ada-lovelace");
  });

  it.each(["", "   "])("hides 'See a demo page' when NEXT_PUBLIC_DEMO_SLUG is %j", (value) => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_SLUG", value);
    render(<HomePage />);

    expect(screen.queryByRole("link", { name: /see a demo page/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create your tip jar/i })).toBeInTheDocument();
  });

  it("hides 'See a demo page' when NEXT_PUBLIC_DEMO_SLUG is not defined", () => {
    delete process.env.NEXT_PUBLIC_DEMO_SLUG;
    render(<HomePage />);

    expect(screen.queryByRole("link", { name: /see a demo page/i })).not.toBeInTheDocument();
  });

  it("renders CTA links as single anchor elements (not button inside link)", () => {
    render(<HomePage />);

    const createLink = screen.getByRole("link", { name: /create your tip jar/i });
    expect(createLink.tagName).toBe("A");
    expect(createLink.querySelector("button")).not.toBeInTheDocument();

    const demoLink = screen.getByRole("link", { name: /see a demo page/i });
    expect(demoLink.tagName).toBe("A");
    expect(demoLink.querySelector("button")).not.toBeInTheDocument();
  });

  it("renders both CTA links side-by-side on larger screens", () => {
    render(<HomePage />);

    const container = screen.getByRole("link", { name: /create your tip jar/i }).closest("div");
    expect(container).toHaveClass("flex");
    expect(container).toHaveClass("sm:flex-row");
  });

  // ── LinkButton styling on CTAs ────────────────────────────────────────────

  it("applies lg size styling to the create CTA", () => {
    render(<HomePage />);

    const createLink = screen.getByRole("link", { name: /create your tip jar/i });
    expect(createLink).toHaveClass("px-7");
    expect(createLink).toHaveClass("py-3.5");
    expect(createLink).toHaveClass("text-base");
  });

  it("applies lg size styling to the demo CTA", () => {
    render(<HomePage />);

    const demoLink = screen.getByRole("link", { name: /see a demo page/i });
    expect(demoLink).toHaveClass("px-7");
    expect(demoLink).toHaveClass("py-3.5");
    expect(demoLink).toHaveClass("text-base");
  });

  it("applies primary variant to the create CTA", () => {
    render(<HomePage />);

    const createLink = screen.getByRole("link", { name: /create your tip jar/i });
    expect(createLink).toHaveClass("bg-brand-500");
    expect(createLink).toHaveClass("text-white");
  });

  it("applies secondary variant to the demo CTA", () => {
    render(<HomePage />);

    const demoLink = screen.getByRole("link", { name: /see a demo page/i });
    expect(demoLink).toHaveClass("bg-surface-strong");
    expect(demoLink).toHaveClass("border");
  });

  // ── Layout and Centering ──────────────────────────────────────────────────

  it("centers the main content", () => {
    render(<HomePage />);

    const main = screen.getByRole("main");
    expect(main).toHaveClass("mx-auto");
    expect(main).toHaveClass("text-center");
  });

  it("constrains max width and adds padding", () => {
    render(<HomePage />);

    const main = screen.getByRole("main");
    expect(main).toHaveClass("max-w-4xl");
    expect(main).toHaveClass("px-4");
    expect(main).toHaveClass("py-24");
  });

  // ── Spacing and Typography ────────────────────────────────────────────────

  it("applies proper heading typography", () => {
    render(<HomePage />);

    const heading = screen.getByRole("heading", { name: /tip any creator in/i });
    expect(heading).toHaveClass("text-5xl");
    expect(heading).toHaveClass("font-bold");
    expect(heading).toHaveClass("tracking-tight");
  });

  it("applies proper body text typography to value proposition", () => {
    render(<HomePage />);

    const valueText = screen.getByText(/cross-border micro-tipping for creators/i);
    expect(valueText).toHaveClass("text-xl");
  });

  // ── How it Works Section ──────────────────────────────────────────────────

  it("renders the how it works section", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /how it works/i })).toBeInTheDocument();
  });

  it("displays three steps in the how it works section", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /claim your link/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /share your qr code/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /get paid and split/i })).toBeInTheDocument();
  });

  it("explains that a wallet is needed in step 1", () => {
    render(<HomePage />);

    expect(screen.getByText(/connect your stellar wallet/i)).toBeInTheDocument();
  });

  it("explains the QR code sharing in step 2", () => {
    render(<HomePage />);

    expect(screen.getByText(/download your qr code and share it anywhere/i)).toBeInTheDocument();
  });

  it("explains USDC payments and splits in step 3", () => {
    render(<HomePage />);

    expect(screen.getByText(/receive tips in usdc instantly/i)).toBeInTheDocument();
    expect(screen.getByText(/add collaborators to automatically split earnings/i)).toBeInTheDocument();
  });

  it("renders steps in a grid layout on larger screens", () => {
    render(<HomePage />);

    const section = screen.getByRole("heading", { name: /how it works/i }).closest("section");
    const grid = section?.querySelector(".grid");
    expect(grid).toHaveClass("md:grid-cols-3");
  });
});
