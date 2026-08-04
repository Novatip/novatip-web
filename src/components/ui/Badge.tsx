import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "usdc";

const variants: Record<BadgeVariant, string> = {
  default: "bg-surface-strong text-fg-muted",
  success: "bg-success/20 text-success border border-success/30",
  warning: "bg-warning/20 text-warning border border-warning/30",
  error:   "bg-danger/20 text-danger border border-danger/30",
  // USDC keeps its own brand blue; the dark variant lifts it for contrast.
  usdc:    "bg-usdc/20 text-usdc border border-usdc/30 dark:text-blue-300 dark:border-blue-500/30",
};

interface BadgeProps {
  variant?:  BadgeVariant;
  children:  React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
