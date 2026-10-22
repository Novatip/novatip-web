import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("includes the required install fields", () => {
    expect(manifest()).toMatchObject({
      name: expect.stringMatching(/\S/),
      short_name: expect.stringMatching(/\S/),
      description: expect.stringMatching(/\S/),
      start_url: expect.stringMatching(/\S/),
      display: expect.stringMatching(/\S/),
      background_color: expect.stringMatching(/\S/),
      theme_color: expect.stringMatching(/\S/),
      icons: expect.arrayContaining([
        expect.objectContaining({
          src: expect.stringMatching(/\S/),
          sizes: expect.stringMatching(/\S/),
          type: expect.stringMatching(/\S/),
        }),
      ]),
    });
  });

  it("references icons that exist under public", () => {
    const icons = manifest().icons ?? [];
    expect(icons.length).toBeGreaterThan(0);

    for (const icon of icons) {
      expect(icon.src).toMatch(/^\//);
      const iconPath = join(process.cwd(), "public", icon.src.slice(1));
      expect(existsSync(iconPath), `Missing manifest icon: ${icon.src}`).toBe(true);
    }
  });

  it("starts at the home page", () => {
    expect(manifest().start_url).toBe("/");
  });
});
