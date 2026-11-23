/**
 * src/lib/utils.test.ts
 *
 * Unit tests for the cn Tailwind class-merging helper.
 *
 * Covers:
 *   - A later conflicting class overrides an earlier one (the reason
 *     twMerge is there at all)
 *   - Non-conflicting classes are all kept
 *   - clsx conditionals: falsy values are dropped, truthy ones kept
 *   - Object and array syntax are supported (clsx passthrough)
 *   - Conflicts are resolved in the order given, not declaration order
 */

import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn – conflict resolution", () => {
  it("lets a later padding class override an earlier one instead of keeping both", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });

  it("resolves conflicts by argument order, not which one is more specific", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("only overrides the conflicting utility, keeping unrelated classes", () => {
    expect(cn("px-4 py-2 text-sm", "px-2")).toBe("py-2 text-sm px-2");
  });

  it("resolves color conflicts within the same utility group", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });
});

describe("cn – clsx passthrough", () => {
  it("drops falsy values", () => {
    expect(cn("px-2", false, null, undefined, "", "py-1")).toBe("px-2 py-1");
  });

  it("includes classes from an object based on truthy keys", () => {
    expect(cn({ "px-2": true, "px-4": false, "text-sm": true })).toBe("px-2 text-sm");
  });

  it("flattens array syntax", () => {
    expect(cn(["px-2", "py-1"], "text-sm")).toBe("px-2 py-1 text-sm");
  });

  it("still merges conflicts coming from a conditional object", () => {
    const isActive = true;
    expect(cn("px-4", { "px-2": isActive })).toBe("px-2");
  });
});

describe("cn – no conflicts", () => {
  it("returns an empty string for no input", () => {
    expect(cn()).toBe("");
  });

  it("keeps every class when nothing conflicts", () => {
    expect(cn("flex", "items-center", "gap-2")).toBe("flex items-center gap-2");
  });
});
