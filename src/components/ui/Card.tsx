import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

/**
 * Ref-forwarding so callers can focus the card itself. TipSuccess relies on
 * this: after a tip completes it moves focus to the success card and marks it
 * as a live region, which is what announces the result to a screen reader.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { glass = true, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl p-6",
        glass ? "glass" : "bg-surface border border-hairline",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading level to render, so callers can keep the page's outline unbroken. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function CardTitle({ level = 3, className, children, ...props }: CardTitleProps) {
  const Heading = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <Heading className={cn("text-lg font-semibold text-fg", className)} {...props}>
      {children}
    </Heading>
  );
}
