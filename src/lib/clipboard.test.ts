/**
 * src/lib/clipboard.test.ts
 *
 * Unit tests for the clipboard helpers.
 *
 * Covers:
 *   - Capability checks report the Clipboard API honestly (jsdom, like an
 *     insecure origin, exposes no navigator.clipboard by default)
 *   - The async Clipboard API is used when present
 *   - A missing or rejecting Clipboard API falls back to execCommand
 *   - copyText() resolves false — never rejects — when nothing can copy
 *   - The fallback textarea carries the text, is cleaned up, and hands focus back
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  copyText,
  isClipboardApiAvailable,
  isExecCommandAvailable,
  isCopySupported,
} from "./clipboard";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Install a fake navigator.clipboard.  Passing null removes it entirely, which
 * is what a browser on a non-secure origin actually looks like.
 */
function stubClipboard(writeText: ((text: string) => Promise<void>) | null) {
  Object.defineProperty(navigator, "clipboard", {
    value:        writeText ? { writeText } : undefined,
    configurable: true,
    writable:     true,
  });
}

/** Install a fake document.execCommand and report what it saw selected. */
function stubExecCommand(impl: () => boolean) {
  const seen: string[] = [];
  const execCommand = vi.fn((command: string) => {
    if (command === "copy") {
      const textarea = document.querySelector("textarea");
      if (textarea) seen.push(textarea.value);
    }
    return impl();
  });

  Object.defineProperty(document, "execCommand", {
    value:        execCommand,
    configurable: true,
    writable:     true,
  });

  return { execCommand, seen };
}

function removeExecCommand() {
  Reflect.deleteProperty(document, "execCommand");
}

beforeEach(() => {
  stubClipboard(null);
  removeExecCommand();
  document.body.innerHTML = "";
});

afterEach(() => {
  stubClipboard(null);
  removeExecCommand();
  vi.restoreAllMocks();
});

// ── Capability checks ─────────────────────────────────────────────────────────

describe("clipboard – capability checks", () => {
  it("reports the Clipboard API missing when the browser does not expose it", () => {
    expect(isClipboardApiAvailable()).toBe(false);
  });

  it("reports the Clipboard API present when writeText exists", () => {
    stubClipboard(async () => {});
    expect(isClipboardApiAvailable()).toBe(true);
  });

  it("does not trust a clipboard object without a usable writeText", () => {
    Object.defineProperty(navigator, "clipboard", {
      value:        {},
      configurable: true,
      writable:     true,
    });
    expect(isClipboardApiAvailable()).toBe(false);
  });

  it("tracks execCommand separately", () => {
    expect(isExecCommandAvailable()).toBe(false);
    stubExecCommand(() => true);
    expect(isExecCommandAvailable()).toBe(true);
  });

  it("reports no copy support when neither mechanism exists", () => {
    expect(isCopySupported()).toBe(false);
  });

  it("reports copy support when only the legacy path exists", () => {
    stubExecCommand(() => true);
    expect(isCopySupported()).toBe(true);
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe("clipboard – Clipboard API", () => {
  it("writes through the Clipboard API and reports success", async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);

    await expect(copyText("https://novatip.xyz/ada")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://novatip.xyz/ada");
  });

  it("never reaches the clipboard for empty text", async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);

    await expect(copyText("")).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });
});

// ── Fallback path ─────────────────────────────────────────────────────────────

describe("clipboard – legacy fallback", () => {
  it("falls back to execCommand when the Clipboard API is absent", async () => {
    const { execCommand, seen } = stubExecCommand(() => true);

    await expect(copyText("https://novatip.xyz/ada")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(seen).toEqual(["https://novatip.xyz/ada"]);
  });

  it("falls back when the Clipboard API rejects", async () => {
    stubClipboard(async () => {
      throw new Error("Document is not focused");
    });
    const { execCommand } = stubExecCommand(() => true);

    await expect(copyText("https://novatip.xyz/ada")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("removes the scratch textarea once the copy is done", async () => {
    stubExecCommand(() => true);

    await copyText("https://novatip.xyz/ada");

    expect(document.querySelector("textarea")).toBeNull();
  });

  it("removes the scratch textarea even when execCommand throws", async () => {
    stubExecCommand(() => {
      throw new Error("not allowed");
    });

    await expect(copyText("https://novatip.xyz/ada")).resolves.toBe(false);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("hands focus back to the element the user was on", async () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    button.focus();

    stubExecCommand(() => true);
    await copyText("https://novatip.xyz/ada");

    expect(document.activeElement).toBe(button);
  });
});

// ── Failure reporting ─────────────────────────────────────────────────────────

describe("clipboard – failure reporting", () => {
  it("reports failure when execCommand refuses", async () => {
    stubExecCommand(() => false);
    await expect(copyText("https://novatip.xyz/ada")).resolves.toBe(false);
  });

  it("reports failure when nothing can copy at all", async () => {
    await expect(copyText("https://novatip.xyz/ada")).resolves.toBe(false);
  });

  it("resolves rather than rejecting when every path fails", async () => {
    stubClipboard(async () => {
      throw new Error("denied");
    });
    stubExecCommand(() => {
      throw new Error("denied");
    });

    await expect(copyText("https://novatip.xyz/ada")).resolves.toBe(false);
  });
});
