/**
 * lib/clipboard.ts
 *
 * Single source of truth for putting text on the clipboard.
 *
 * `navigator.clipboard` only exists in a secure context — HTTPS or localhost.
 * Hitting the dev server from a phone on the LAN (http://192.168.x.x:3000) is
 * *not* secure, and there the property is simply `undefined`.  Since sharing a
 * tip link is the core action of the product, a copy that quietly does nothing
 * is worse than one that admits it failed, so every path here reports back
 * whether the text actually made it onto the clipboard.
 *
 * Two attempts are made, in order:
 *   1. The async Clipboard API, when the browser exposes it.
 *   2. `document.execCommand("copy")` over an off-screen textarea — deprecated,
 *      but it is the only thing that works on an insecure origin and it is
 *      still supported everywhere we care about.
 *
 * Callers that get `false` back are expected to show the user the text so they
 * can copy it by hand.
 */

/** Whether the async Clipboard API is usable in this context. */
export function isClipboardApiAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function"
  );
}

/** Whether the legacy `execCommand` fallback is usable in this context. */
export function isExecCommandAvailable(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.execCommand === "function"
  );
}

/**
 * Whether *any* copy mechanism is available.
 *
 * Note this is a capability check, not a guarantee: `execCommand` can still
 * refuse at call time.  Only the resolved value of copyText() is authoritative.
 */
export function isCopySupported(): boolean {
  return isClipboardApiAvailable() || isExecCommandAvailable();
}

/**
 * Copy `text` to the clipboard.
 *
 * Resolves `true` only when the text is genuinely on the clipboard; never
 * rejects, so callers can branch on the result instead of wrapping in
 * try/catch and accidentally swallowing the failure.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  if (isClipboardApiAvailable()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied, or the document was not focused — fall through to
      // the legacy path rather than giving up on the copy entirely.
    }
  }

  return copyViaExecCommand(text);
}

// ── Legacy fallback ───────────────────────────────────────────────────────────

/**
 * Select the textarea's contents in a way iOS Safari also honours.
 *
 * A plain setSelectionRange() is ignored there on a readonly field, so a DOM
 * Range is laid over the node as well.
 */
function selectAll(textarea: HTMLTextAreaElement): void {
  const range = document.createRange();
  range.selectNodeContents(textarea);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  textarea.setSelectionRange(0, textarea.value.length);
}

function copyViaExecCommand(text: string): boolean {
  if (!isExecCommandAvailable()) return false;

  const previouslyFocused = document.activeElement as HTMLElement | null;
  const textarea          = document.createElement("textarea");

  textarea.value = text;
  // readonly keeps the on-screen keyboard from popping up on mobile.
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.setAttribute("tabindex", "-1");
  // position:fixed avoids scrolling the page to the element on focus; the
  // 1px box (rather than display:none) keeps it selectable.
  textarea.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:none;" +
    "outline:none;opacity:0;pointer-events:none;";

  document.body.appendChild(textarea);

  try {
    selectAll(textarea);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    window.getSelection()?.removeAllRanges();
    // Put focus back where the user left it — usually the button they pressed.
    previouslyFocused?.focus?.();
  }
}
