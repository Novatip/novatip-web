/**
 * src/components/QRDownload.test.tsx
 *
 * Unit tests for QRDownload's copy affordances.
 *
 * The scenario that matters is a phone hitting the dev server over a LAN IP:
 * an insecure origin, where navigator.clipboard is simply not there.  jsdom
 * gives us that for free — it exposes neither navigator.clipboard nor
 * document.execCommand unless a test installs them.
 *
 * Covers:
 *   - A working clipboard confirms the copy
 *   - A blocked clipboard produces visible feedback rather than a silent no-op
 *   - The failure exposes the link for manual copying, pre-selected
 *   - The failure can be dismissed, and clears on a successful retry
 *   - Both the inline "Copy" and the "Copy link" button behave the same way
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QRDownload } from "./QRDownload";

const SLUG   = "ada";
const PNG_URL = "https://api.novatip.xyz/qr/ada.png";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Give the page a working Clipboard API; returns the spy. */
function grantClipboard() {
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", {
    value:        { writeText },
    configurable: true,
    writable:     true,
  });
  return writeText;
}

/** Strip every copy mechanism — what an insecure origin actually looks like. */
function blockClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value:        undefined,
    configurable: true,
    writable:     true,
  });
  Reflect.deleteProperty(document, "execCommand");
}

function expectedTipUrl() {
  return `${window.location.origin}/${SLUG}`;
}

const inlineCopy = () => screen.getByRole("button", { name: "Copy tip URL" });
const copyButton = () => screen.getByRole("button", { name: "Copy tip link" });

beforeEach(() => {
  blockClipboard();
});

afterEach(() => {
  cleanup();
  blockClipboard();
  vi.restoreAllMocks();
});

// ── Successful copy ───────────────────────────────────────────────────────────

describe("QRDownload – successful copy", () => {
  it("writes the tip URL and confirms it", async () => {
    const writeText = grantClipboard();
    render(<QRDownload slug={SLUG} pngUrl={PNG_URL} />);

    await userEvent.click(copyButton());

    expect(writeText).toHaveBeenCalledWith(expectedTipUrl());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copy tip link" })).toHaveTextContent("✓ Copied"),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("confirms on the inline copy control too", async () => {
    grantClipboard();
    render(<QRDownload slug={SLUG} pngUrl={PNG_URL} />);

    await userEvent.click(inlineCopy());

    await waitFor(() => expect(inlineCopy()).toHaveTextContent("Copied!"));
  });
});

// ── Failed copy ───────────────────────────────────────────────────────────────

describe("QRDownload – failed copy", () => {
  it("does not fail silently when the clipboard is unavailable", async () => {
    render(<QRDownload slug={SLUG} pngUrl={PNG_URL} />);

    await userEvent.click(copyButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't copy automatically/i);
    expect(screen.getByRole("button", { name: "Copy tip link" })).toHaveTextContent("Copy failed");
    expect(inlineCopy()).toHaveTextContent("Failed");
  });

  it("reports the failure when the Clipboard API rejects", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value:        { writeText: vi.fn(async () => { throw new Error("denied"); }) },
      configurable: true,
      writable:     true,
    });
    render(<QRDownload slug={SLUG} pngUrl={PNG_URL} />);

    await userEvent.click(copyButton());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("offers the link in a pre-selected field so it can be copied by hand", async () => {
    render(<QRDownload slug={SLUG} pngUrl={PNG_URL} />);

    await userEvent.click(copyButton());

    const field = await screen.findByLabelText(/tip link to copy manually/i);
    expect(field).toHaveValue(expectedTipUrl());
    expect(field).toHaveFocus();
    expect((field as HTMLInputElement).selectionStart).toBe(0);
    expect((field as HTMLInputElement).selectionEnd).toBe(expectedTipUrl().length);
  });

  it("keeps the failure on screen instead of hiding it after a moment", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<QRDownload slug={SLUG} pngUrl={PNG_URL} />);

      await userEvent.click(copyButton());
      await screen.findByRole("alert");

      vi.advanceTimersByTime(10_000);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("surfaces the same failure from the inline copy control", async () => {
    render(<QRDownload slug={SLUG} pngUrl={PNG_URL} />);

    await userEvent.click(inlineCopy());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

// ── Recovering ────────────────────────────────────────────────────────────────

describe("QRDownload – recovering from a failure", () => {
  it("dismisses the fallback on request", async () => {
    render(<QRDownload slug={SLUG} pngUrl={PNG_URL} />);

    await userEvent.click(copyButton());
    await screen.findByRole("alert");

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Copy tip link" })).toHaveTextContent("Copy link");
  });

  it("clears the fallback once a copy finally works", async () => {
    render(<QRDownload slug={SLUG} pngUrl={PNG_URL} />);

    await userEvent.click(copyButton());
    await screen.findByRole("alert");

    grantClipboard();
    await userEvent.click(copyButton());

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Copy tip link" })).toHaveTextContent("✓ Copied");
  });
});
