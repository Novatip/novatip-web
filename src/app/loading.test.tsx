/**
 * src/app/loading.test.tsx
 *
 * Every route skeleton must tell assistive technology the page is loading,
 * and keep its decorative shapes out of the accessibility tree.
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import TipPageLoading from "./[slug]/loading";
import DashboardLoading from "./dashboard/loading";
import QRLoading from "./dashboard/qr/loading";
import SettingsLoading from "./dashboard/settings/loading";
import SplitsLoading from "./dashboard/splits/loading";
import WebhooksLoading from "./dashboard/webhooks/loading";

afterEach(cleanup);

const LOADERS = [
  ["tip page", TipPageLoading],
  ["dashboard", DashboardLoading],
  ["qr", QRLoading],
  ["settings", SettingsLoading],
  ["splits", SplitsLoading],
  ["webhooks", WebhooksLoading],
] as const;

describe.each(LOADERS)("%s loading skeleton", (_name, Loading) => {
  it("exposes a Loading status message", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("hides the skeleton shapes from assistive technology", () => {
    const { container } = render(<Loading />);

    const shapes = container.querySelectorAll(".animate-pulse");
    expect(shapes.length).toBeGreaterThan(0);
    shapes.forEach((shape) => {
      expect(shape.closest('[aria-hidden="true"]')).not.toBeNull();
    });
  });
});
