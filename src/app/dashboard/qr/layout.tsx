/**
 * app/dashboard/qr/layout.tsx
 *
 * Server layout supplying the QR route's title. The page itself is a client
 * component, so it cannot export metadata directly.
 */

import type { Metadata } from "next";
import { pageTitle } from "@/lib/pageTitle";

export const metadata: Metadata = pageTitle("QR Code");

export default function QrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
