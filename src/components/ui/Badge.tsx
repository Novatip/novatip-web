import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "usdc";

const variants: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-gray-300",
  success: "bg-green-500/20 text-green-400 border border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  error:   "bg-red-500/20 text-red-400 border border-red-500/30",
  usdc:    "bg-blue-500/20 text-blue-300 border border-blue-500/30",
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
