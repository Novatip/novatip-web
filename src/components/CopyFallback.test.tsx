/**
 * src/components/CopyFallback.test.tsx
 *
 * Unit tests for CopyFallback.
 *
 * Covers:
 *   - The text is rendered in a selectable form: a readonly input, with the
 *     select-all style, that is focused and has its contents selected on mount
 *   - The dismiss control calls onDismiss
 *   - The noun prop customises both the wording and the field's accessible name
 *   - Integration: wired to the real useCopyToClipboard hook, the fallback is
 *     absent until a copy attempt genuinely fails, and never appears after a
 *     successful one
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyFallback } from "./CopyFallback";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import * as clipboard from "@/lib/clipboard";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const TEXT = "https://novatip.xyz/ada";

describe("CopyFallback – selectable text", () => {
  it("renders the text in a readonly, selectable input", () => {
    render(<CopyFallback text={TEXT} onDismiss={vi.fn()} />);

    const field = screen.getByRole("textbox");
    expect(field).toHaveValue(TEXT);
    expect(field).toHaveAttribute("readonly");
    expect(field).toHaveClass("select-all");
  });

  it("focuses and selects the field on mount, so copying is a single gesture", () => {
    const selectSpy = vi.spyOn(HTMLInputElement.prototype, "select");
    render(<CopyFallback text={TEXT} onDismiss={vi.fn()} />);

    const field = screen.getByRole("textbox");
    expect(field).toHaveFocus();
    expect(selectSpy).toHaveBeenCalled();
  });

  it("re-selects the field if it regains focus (e.g. after a manual click)", () => {
    const selectSpy = vi.spyOn(HTMLInputElement.prototype, "select");
    render(<CopyFallback text={TEXT} onDismiss={vi.fn()} />);
    selectSpy.mockClear();

    const field = screen.getByRole("textbox");
    field.blur();
    field.focus();

    expect(selectSpy).toHaveBeenCalled();
  });
});

describe("CopyFallback – wording and accessible name", () => {
  it("names the field generically by default", () => {
    render(<CopyFallback text={TEXT} onDismiss={vi.fn()} />);
    expect(screen.getByLabelText("Link to copy manually")).toBeInTheDocument();
    expect(screen.getByText(/select the link below/i)).toBeInTheDocument();
  });

  it("uses a custom noun in both the message and the accessible name", () => {
    render(<CopyFallback text={TEXT} onDismiss={vi.fn()} noun="message" />);
    expect(screen.getByLabelText("Message to copy manually")).toBeInTheDocument();
    expect(screen.getByText(/select the message below/i)).toBeInTheDocument();
  });
});

describe("CopyFallback – dismiss", () => {
  it("calls onDismiss when the Dismiss control is clicked", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<CopyFallback text={TEXT} onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ── Shown only after a failure ────────────────────────────────────────────────

/** Minimal stand-in for a real caller (e.g. QRDownload): copy button + fallback. */
function CopyHarness({ text }: { text: string }) {
  const { failed, copy, reset } = useCopyToClipboard();
  return (
    <div>
      <button onClick={() => void copy(text)}>Copy</button>
      {failed && <CopyFallback text={text} onDismiss={reset} />}
    </div>
  );
}

describe("CopyFallback – shown only after a failure", () => {
  it("is absent before any copy attempt", () => {
    render(<CopyHarness text={TEXT} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("stays absent after a successful copy", async () => {
    vi.spyOn(clipboard, "copyText").mockResolvedValue(true);
    const user = userEvent.setup();
    render(<CopyHarness text={TEXT} />);

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("appears only once a copy attempt genuinely fails", async () => {
    vi.spyOn(clipboard, "copyText").mockResolvedValue(false);
    const user = userEvent.setup();
    render(<CopyHarness text={TEXT} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue(TEXT);
  });
});
