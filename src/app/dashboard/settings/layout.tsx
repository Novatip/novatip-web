/**
 * app/dashboard/settings/layout.tsx
 *
 * Server layout supplying the Settings route's title. The page itself is a
 * client component, so it cannot export metadata directly.
 */

import type { Metadata } from "next";
import { pageTitle } from "@/lib/pageTitle";

export const metadata: Metadata = pageTitle("Settings");

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
