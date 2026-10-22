"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  displayName: string;
  slug: string;
  className?: string;
}

/**
 * Avatar fallback strategy:
 * We do not use third-party fallback services (such as api.dicebear.com) because:
 * 1. Third-party fallback URLs leak viewer activity and creator slugs to third-party servers.
 * 2. If the third-party service is slow or unreachable, the avatar fails to render entirely.
 * 3. Network or broken image errors for creators with real avatar URLs should gracefully fall back.
 *
 * Instead, if no avatarUrl is provided or if loading the image fails (onError),
 * we fall back to rendering initials generated locally from the display name or slug.
 */
export function getInitials(displayName: string, slug?: string): string {
  const name = displayName.trim().replace(/^@/, "");
  if (!name) return (slug || "?").slice(0, 2).toUpperCase();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ src, displayName, slug, className }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const initials = getInitials(displayName, slug);
  const showFallback = !src || imageError;
  const accessibleName = `${displayName.trim() || `@${slug}`} avatar`;

  if (showFallback) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center font-bold select-none bg-surface-strong text-fg-muted border border-hairline rounded-full ${className || ""}`}
        role="img"
        aria-label={accessibleName}
      >
        <span className="text-lg" aria-hidden="true">{initials}</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={accessibleName}
      fill
      className={`object-cover ${className || ""}`}
      unoptimized
      onError={() => setImageError(true)}
    />
  );
}
