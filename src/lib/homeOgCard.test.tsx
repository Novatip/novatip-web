/**
 * src/lib/homeOgCard.test.tsx
 *
 * The home page preview card is rendered by Satori, which throws on two
 * things regular JSX allows. Those throws only happen at render time on the
 * edge, so these tests walk the element tree instead of rendering it:
 *
 *   - every div with more than one child sets display: "flex"
 *   - no element mixes literal text with another child (`@{slug}` style)
 *
 * Also covers the two route files: 1200 by 630 PNG, edge runtime, one card.
 */

import { describe, it, expect, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

const rendered: { element: ReactElement | null; options: unknown } = {
  element: null,
  options: null,
};

vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: ReactElement, options: unknown) {
      rendered.element = element;
      rendered.options = options;
    }
  },
}));

import { renderHomeOgCard } from "./homeOgCard";
import * as openGraph from "@/app/opengraph-image";
import * as twitter from "@/app/twitter-image";

type El = ReactElement<{ style?: Record<string, unknown>; children?: ReactNode }>;

function childrenOf(el: El): ReactNode[] {
  const { children } = el.props;
  if (children === undefined || children === null || children === false) return [];
  return Array.isArray(children) ? children.flat() : [children];
}

function walk(node: ReactNode, visit: (el: El) => void): void {
  if (node === null || typeof node !== "object" || !("props" in node)) return;
  const el = node as El;
  visit(el);
  childrenOf(el).forEach((child) => walk(child, visit));
}

function renderTree(): El {
  rendered.element = null;
  renderHomeOgCard();
  return rendered.element as unknown as El;
}

describe("renderHomeOgCard – Satori rules", () => {
  it("sets display: flex on every div with more than one child", () => {
    const offenders: string[] = [];
    walk(renderTree(), (el) => {
      if (el.type === "div" && childrenOf(el).length > 1 && el.props.style?.display !== "flex") {
        offenders.push(String(el.props.children));
      }
    });

    expect(offenders).toEqual([]);
  });

  it("never mixes literal text with another child node", () => {
    const offenders: unknown[] = [];
    walk(renderTree(), (el) => {
      const kids = childrenOf(el);
      if (kids.length > 1 && kids.some((k) => typeof k === "string")) {
        offenders.push(kids);
      }
    });

    expect(offenders).toEqual([]);
  });

  it("renders at 1200 by 630", () => {
    renderTree();

    expect(rendered.options).toEqual({ width: 1200, height: 630 });
  });
});

describe.each([
  ["opengraph-image", openGraph],
  ["twitter-image", twitter],
])("app/%s", (_name, mod) => {
  it("is a 1200 by 630 PNG on the edge runtime", () => {
    expect(mod.size).toEqual({ width: 1200, height: 630 });
    expect(mod.contentType).toBe("image/png");
    expect(mod.runtime).toBe("edge");
    expect(mod.alt).toBeTruthy();
  });

  it("renders the home card", () => {
    rendered.element = null;
    (mod.default as () => unknown)();

    expect(rendered.element).not.toBeNull();
  });
});
