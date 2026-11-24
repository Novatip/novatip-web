import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { buttonBase, buttonSizes, buttonVariants } from "./buttonStyles";
import type { ButtonSize, ButtonVariant } from "./buttonStyles";

interface LinkButtonProps extends ComponentPropsWithoutRef<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * A Next.js Link that looks exactly like a Button.
 * Use this instead of wrapping <Button> inside <Link> — an anchor containing
 * a button is invalid HTML and creates two keyboard tab stops for one action.
 */
export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        buttonBase,
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
