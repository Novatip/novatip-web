/**
 * src/components/onboarding/ShareStep.test.tsx
 *
 * Covers:
 *   - QR PNG URL is built from config.apiUrl directly (no replace hack)
 *   - URL is correct for the default API path
 *   - URL is correct when the API is mounted under a different prefix
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@/components/QRDownload", () => ({
  QRDownload: ({ pngUrl }: { slug: string; pngUrl: string }) => (
    <div data-testid="qr-download" data-png-url={pngUrl} />
  ),
}));

// Mutable so individual tests can set a different apiUrl.
const mockConfig = { apiUrl: "http://localhost:3001/api/v1" };
vi.mock("@/lib/config", () => ({
  get config() { return mockConfig; },
}));

import { ShareStep } from "./ShareStep";

describe("ShareStep – QR PNG URL", () => {
  it("builds the URL by appending to the API base for the default config", () => {
    mockConfig.apiUrl = "http://localhost:3001/api/v1";
    render(<ShareStep slug="ada" />);
    expect(screen.getByTestId("qr-download").getAttribute("data-png-url")).toBe(
      "http://localhost:3001/api/v1/qr/ada/png",
    );
  });

  it("builds the correct URL when the API is mounted under a different prefix", () => {
    mockConfig.apiUrl = "https://api.example.com/v2";
    render(<ShareStep slug="ada" />);
    expect(screen.getByTestId("qr-download").getAttribute("data-png-url")).toBe(
      "https://api.example.com/v2/qr/ada/png",
    );
  });
});
