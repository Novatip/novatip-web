/**
 * app/onboarding/layout.tsx
 *
 * Server layout supplying the Onboarding route's title. The wizard itself is a
 * client component, so it cannot export metadata directly.
 */

import type { Metadata } from "next";
import { pageTitle } from "@/lib/pageTitle";

export const metadata: Metadata = pageTitle("Onboarding");

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
