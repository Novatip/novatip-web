/**
 * components/ui/buttonStyles.ts
 *
 * Class maps shared by Button and LinkButton so the two always look the same.
 * A change to a variant or size is made here once.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export const buttonVariants: Record<ButtonVariant, string> = {
  // text-white is intentional on primary — it sits on brand-500 in both themes.
  primary: "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20",
  secondary: "bg-surface-strong hover:bg-hairline text-fg border border-hairline-strong",
  ghost: "hover:bg-surface-strong text-fg-muted hover:text-fg",
  danger: "bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30",
};

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3.5 text-base rounded-xl",
};

/** Layout, transition and focus classes common to every button. */
export const buttonBase = [
  "inline-flex items-center justify-center gap-2 font-medium",
  "transition-all duration-200 focus:outline-none focus:ring-2",
  "focus:ring-brand-500/50",
];
