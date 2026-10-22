/**
 * app/dashboard/(overview)/layout.tsx
 *
 * Server layout for the dashboard index. The page below it is a client
 * component (it reads the wallet and fetches totals), so the route's metadata
 * has to be declared up here.
 *
 * The route group keeps the URL at /dashboard while giving the index its own
 * layout — `dashboard/layout.tsx` is the client-side shell and cannot export
 * metadata itself.
 */

import type { Metadata } from "next";
import { pageTitle } from "@/lib/pageTitle";

export const metadata: Metadata = pageTitle("Overview");

export default function OverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
