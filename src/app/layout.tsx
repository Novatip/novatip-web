import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title:       "Novatip — Tap to tip any creator",
  description: "Cross-border micro-tipping for creators, streamers, and street musicians. Powered by Stellar.",
  openGraph: {
    title:       "Novatip",
    description: "Tap-to-tip any creator in 2 seconds, cross-border.",
    type:        "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
