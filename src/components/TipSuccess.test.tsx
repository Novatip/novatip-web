/**
 * src/components/TipSuccess.test.tsx
 *
 * Unit tests for TipSuccess's share actions.
 *
 * The component renders two different layouts. Where the browser has a native
 * share sheet it leads with a share button and keeps copy alongside it; where
 * it does not, copy is the only control. Which one appears is decided after
 * mount — the server has no `navigator`, so guessing during render would mean
 * hydrating a different button than was sent — hence the `findBy*` queries
 * below rather than synchronous ones.
 *
 * Covers:
 *   - The native share sheet is preferred when the browser has one
 *   - Cancelling that sheet is not treated as a failure
 *   - A share that genuinely fails falls through to the clipboard
 *   - Without either API the button reports the failure and offers the message
 *   - A working clipboard confirms the copy
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TipSuccess } from "./TipSuccess";

// canvas-confetti needs a real canvas; jsdom has none and the burst is not
// what these tests are about.
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

const SLUG   = "ada";
const AMOUNT = "5.00";

// ── Helpers ───────────────────────────────────────────────────────────────────

function defineOnNavigator(key: "share" | "canShare" | "clipboard", value: unknown) {
  Object.defineProperty(navigator, key, {
    value,
    configurable: true,
    writable:     true,
  });
}

function grantClipboard() {
  const writeText = vi.fn(async () => {});
  defineOnNavigator("clipboard", { writeText });
  return writeText;
}

/** No share sheet, no clipboard, no execCommand — an insecure origin. */
function blockEverything() {
  defineOnNavigator("share", undefined);
  defineOnNavigator("canShare", undefined);
  defineOnNavigator("clipboard", undefined);
  Reflect.deleteProperty(document, "execCommand");
}

function expectedText() {
  return `I just tipped @${SLUG} $${AMOUNT} USDC on Novatip! 💸`;
}

function expectedUrl() {
  return `${window.location.origin}/${SLUG}`;
}

function expectedMessage() {
  return `${expectedText()} ${expectedUrl()}`;
}

/** Only rendered once the share sheet has been detected after mount. */
const findShareButton = () =>
  screen.findByRole("button", { name: `Share @${SLUG}'s tip page` });

const copyButton = () => screen.getByRole("button", { name: "Copy link to clipboard" });

function renderSuccess() {
  return render(<TipSuccess amount={AMOUNT} slug={SLUG} onReset={vi.fn()} />);
}

beforeEach(() => {
  blockEverything();
});

afterEach(() => {
  cleanup();
  blockEverything();
  vi.restoreAllMocks();
});

// ── Native share ──────────────────────────────────────────────────────────────

describe("TipSuccess – native share", () => {
  it("uses the share sheet when the browser has one", async () => {
    const share = vi.fn(async () => {});
    defineOnNavigator("share", share);
    const writeText = grantClipboard();
    renderSuccess();

    await userEvent.click(await findShareButton());

    expect(share).toHaveBeenCalledWith({
      title: `Tip @${SLUG} on Novatip`,
      text:  expectedText(),
      url:   expectedUrl(),
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("treats a cancelled share as a non-event", async () => {
    defineOnNavigator("share", vi.fn(async () => {
      throw Object.assign(new Error("cancelled"), { name: "AbortError" });
    }));
    const writeText = grantClipboard();
    renderSuccess();

    await userEvent.click(await findShareButton());

    // Backing out is a decision, not a failure: nothing is reported and the
    // clipboard is deliberately not used as a consolation.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when the share itself fails", async () => {
    defineOnNavigator("share", vi.fn(async () => {
      throw new Error("Permission denied");
    }));
    const writeText = grantClipboard();
    renderSuccess();

    await userEvent.click(await findShareButton());

    expect(writeText).toHaveBeenCalledWith(expectedMessage());
    await waitFor(() => expect(copyButton()).toHaveTextContent("✓ Link copied"));
  });
});

// ── Clipboard fallback ────────────────────────────────────────────────────────

describe("TipSuccess – clipboard fallback", () => {
  it("copies and confirms when there is no share sheet", async () => {
    const writeText = grantClipboard();
    renderSuccess();

    await userEvent.click(copyButton());

    expect(writeText).toHaveBeenCalledWith(expectedMessage());
    await waitFor(() => expect(copyButton()).toHaveTextContent("✓ Link copied"));
  });

  it("does not fail silently when nothing can copy", async () => {
    renderSuccess();

    await userEvent.click(copyButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't copy automatically/i);
    expect(copyButton()).toHaveTextContent("Couldn't copy");
  });

  it("offers the share message for manual copying, pre-selected", async () => {
    renderSuccess();

    await userEvent.click(copyButton());

    const field = await screen.findByLabelText(/message to copy manually/i);
    expect(field).toHaveValue(expectedMessage());
    expect(field).toHaveFocus();
  });

  it("clears the failure on a successful retry", async () => {
    renderSuccess();

    await userEvent.click(copyButton());
    await screen.findByRole("alert");

    grantClipboard();
    await userEvent.click(copyButton());

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(copyButton()).toHaveTextContent("✓ Link copied");
  });
});
