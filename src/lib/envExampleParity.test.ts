/**
 * src/lib/envExampleParity.test.ts
 *
 * Keeps .env.example in step with the variables config.ts reads.
 *
 * Both files are read as text. Importing config.ts would run its fail-fast
 * validation, which is not what this test is about — it checks the contract
 * between the template and the code, without executing any project code.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Vitest runs from the repository root, both locally and in CI.
const configSource = readFileSync(resolve(process.cwd(), "src/lib/config.ts"), "utf8");
const envExampleSource = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");

/** Every literal process.env.NEXT_PUBLIC_* access in config.ts, ignoring comments. */
function namesReadByConfig(source: string): Set<string> {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  return new Set(
    Array.from(code.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g), (match) => match[1]),
  );
}

/**
 * Every active KEY=value declaration in .env.example. Commented-out lines are
 * documentation for optional values with no default (e.g. DEMO_SLUG), not
 * declarations — a variable only counts as listed here when it has a value.
 */
function namesDocumentedInTemplate(source: string): Set<string> {
  return new Set(
    Array.from(source.matchAll(/^[ \t]*(NEXT_PUBLIC_[A-Z0-9_]+)[ \t]*=/gm), (match) => match[1]),
  );
}

describe(".env.example / config.ts parity", () => {
  it("documents every NEXT_PUBLIC_ variable that config.ts reads", () => {
    const documented = namesDocumentedInTemplate(envExampleSource);
    const missing = [...namesReadByConfig(configSource)].filter((name) => !documented.has(name));
    expect(missing).toEqual([]);
  });

  it("does not document NEXT_PUBLIC_ variables that config.ts no longer reads", () => {
    const read = namesReadByConfig(configSource);
    const stale = [...namesDocumentedInTemplate(envExampleSource)].filter(
      (name) => !read.has(name),
    );
    expect(stale).toEqual([]);
  });
});
