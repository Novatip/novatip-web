/**
 * lib/truncate.ts
 *
 * Shorten user text without cutting a character in half.
 *
 * String#slice counts UTF-16 code units, so an emoji straddling the cut
 * leaves a lone surrogate behind — the same mistake fixed for avatar
 * initials. Counting user-perceived characters (grapheme clusters) also keeps
 * ZWJ sequences and flags whole; where Intl.Segmenter is missing, code points
 * are the fallback, which at least never splits a surrogate pair.
 */

function toCharacters(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/**
 * Return `text` unchanged when it has at most `max` characters, otherwise its
 * first `max` characters (trailing whitespace dropped) followed by `ellipsis`.
 */
export function truncateText(text: string, max: number, ellipsis = "..."): string {
  const chars = toCharacters(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, Math.max(max, 0)).join("").trimEnd()}${ellipsis}`;
}
