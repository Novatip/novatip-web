import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:   string;
  error?:   string;
  hint?:    string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-fg-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl bg-surface-strong border border-hairline px-4 py-2.5",
          "text-fg placeholder:text-fg-dim text-sm",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50",
          "transition-all duration-200",
          error && "border-danger/50 focus:ring-danger/30",
          className,
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-fg-faint">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
