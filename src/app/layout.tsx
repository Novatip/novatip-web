import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { config } from "@/lib/config";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  /*
    Every relative URL in metadata — Open Graph images most of all — is
    resolved against this.  Without it Next falls back to localhost:3000, so a
    tip link pasted into Twitter, WhatsApp or Discord would advertise a preview
    image no scraper outside the developer's machine can fetch.

    Driven by NEXT_PUBLIC_SITE_URL so preview deployments describe themselves
    rather than production; see resolveSiteUrl in lib/config.ts.
  */
  metadataBase: new URL(config.siteUrl),

  title:       "Novatip — Tap to tip any creator",
  description: "Cross-border micro-tipping for creators, streamers, and street musicians. Powered by Stellar.",
  openGraph: {
    title:       "Novatip",
    description: "Tap-to-tip any creator in 2 seconds, cross-border.",
    type:        "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)",  color: "#030712" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the script below adds a `dark` class that the
    // server render cannot know about, so <html> legitimately differs between
    // server and client markup.  React only ignores the mismatch one level
    // deep, which is exactly the scope we want.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/*
          Applies the stored (or OS) theme before the first paint.  Must stay
          inline and blocking — a deferred or external script would run after
          the browser has already painted, which is the flash we're fixing.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
