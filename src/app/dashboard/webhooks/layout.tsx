/**
 * app/dashboard/webhooks/layout.tsx
 *
 * Server layout supplying the Webhooks route's title. The page itself is a
 * client component, so it cannot export metadata directly.
 */

import type { Metadata } from "next";
import { pageTitle } from "@/lib/pageTitle";

export const metadata: Metadata = pageTitle("Webhooks");

export default function WebhooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
