/**
 * app/dashboard/history/layout.tsx
 *
 * Server layout supplying the History route's title. The page itself is a
 * client component, so it cannot export metadata directly.
 */

import type { Metadata } from "next";
import { pageTitle } from "@/lib/pageTitle";

export const metadata: Metadata = pageTitle("History");

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
