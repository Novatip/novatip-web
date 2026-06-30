import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?:    Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:   "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20",
  secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
  ghost:     "hover:bg-white/10 text-gray-300 hover:text-white",
  danger:    "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3.5 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size    = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled ?? loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium",
        "transition-all duration-200 focus:outline-none focus:ring-2",
        "focus:ring-brand-500/50 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
