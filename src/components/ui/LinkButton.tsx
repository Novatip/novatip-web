import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

interface LinkButtonProps extends ComponentPropsWithoutRef<typeof Link> {
  variant?: Variant;
  size?:    Size;
}

const variants: Record<Variant, string> = {
  primary:   "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20",
  secondary: "bg-surface-strong hover:bg-hairline text-fg border border-hairline-strong",
  ghost:     "hover:bg-surface-strong text-fg-muted hover:text-fg",
  danger:    "bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3.5 text-base rounded-xl",
};

/**
 * A Next.js Link that looks exactly like a Button.
 * Use this instead of wrapping <Button> inside <Link> — an anchor containing
 * a button is invalid HTML and creates two keyboard tab stops for one action.
 */
export function LinkButton({
  variant = "primary",
  size    = "md",
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium",
        "transition-all duration-200 focus:outline-none focus:ring-2",
        "focus:ring-brand-500/50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
