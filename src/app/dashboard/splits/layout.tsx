/**
 * app/dashboard/splits/layout.tsx
 *
 * Server layout supplying the Splits route's title. The page itself is a
 * client component, so it cannot export metadata directly.
 */

import type { Metadata } from "next";
import { pageTitle } from "@/lib/pageTitle";

export const metadata: Metadata = pageTitle("Splits");

export default function SplitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
