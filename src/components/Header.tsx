"use client";

/**
 * Header.tsx
 *
 * Global top navigation bar.
 * Shows the Novatip logo, dashboard link (if connected), and wallet button.
 */

import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@/contexts/WalletContext";
import { WalletConnectButton } from "./WalletConnectButton";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { isConnected } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-hairline bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="Novatip home"
          >
            {/* unoptimized: the optimizer refuses SVG unless dangerouslyAllowSVG
                is enabled, and this is our own asset, not user input. */}
            <Image
              src="/logo.svg"
              alt=""
              width={28}
              height={28}
              className="rounded-md"
              unoptimized
              priority
            />
            <span className="font-semibold text-fg group-hover:text-accent transition-colors">
              Novatip
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-4">
            {isConnected && (
              <Link
                href="/dashboard"
                className="text-sm text-fg-subtle hover:text-fg transition-colors hidden sm:block"
              >
                Dashboard
              </Link>
            )}
            <ThemeToggle />
            <WalletConnectButton size="sm" />
          </nav>

        </div>
      </div>
    </header>
  );
}
