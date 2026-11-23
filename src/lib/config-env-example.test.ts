/**
 * Ensure the active public environment variables documented in .env.example
 * stay in sync with the literal NEXT_PUBLIC_ reads in config.ts.
 *
 * This test parses the source and reads the example file without importing or
 * evaluating config.ts, whose module-level validation requires deployment
 * configuration.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));

function readConfigEnvironmentVariables(source: string): Set<string> {
  const sourceFile = ts.createSourceFile(
    "config.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const names = new Set<string>();

  function visit(node: ts.Node): void {
    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text.startsWith("NEXT_PUBLIC_") &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "process" &&
      node.expression.name.text === "env"
    ) {
      names.add(node.name.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return names;
}

function readExampleEnvironmentVariables(source: string): Set<string> {
  const names = new Set<string>();

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=/);
    if (match) names.add(match[1]);
  }

  return names;
}

describe("environment example", () => {
  it("documents exactly the public variables read by config.ts", () => {
    const configSource = readFileSync(resolve(testDirectory, "config.ts"), "utf8");
    const envExample = readFileSync(resolve(testDirectory, "../../.env.example"), "utf8");

    const configNames = [...readConfigEnvironmentVariables(configSource)].sort();
    const exampleNames = [...readExampleEnvironmentVariables(envExample)].sort();

    expect(exampleNames).toEqual(configNames);
  });
});
