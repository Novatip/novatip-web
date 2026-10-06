"use client";

/**
 * AmountPicker.tsx
 *
 * Lets the tipper choose a USDC amount via preset buttons or a custom input.
 * Emits the selected amount as a display string (e.g. "2.50").
 *
 * @example
 * <AmountPicker value={amount} onChange={setAmount} />
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { formatUsdc, isValidTipAmount, usdcToStroops } from "@novatip/sdk";
import { MAX_CUSTOM_TIP_USDC, isWithinTipCeiling } from "@/lib/tipAmount";

/** Used when a creator hasn't configured their own preset amounts. */
export const DEFAULT_AMOUNT_PRESETS = ["1", "2", "5", "10", "25"];

interface AmountPickerProps {
  value:     string;
  onChange:  (value: string) => void;
  disabled?: boolean;
  /** Preset amount buttons, in display order. Defaults to DEFAULT_AMOUNT_PRESETS. */
  presets?:  string[];
  /** The connected supporter's USDC balance, if known — null while unknown/loading. */
  balance?:  bigint | null;
}

export function AmountPicker({
  value,
  onChange,
  disabled = false,
  presets = DEFAULT_AMOUNT_PRESETS,
  balance = null,
}: AmountPickerProps) {
  const [isCustom, setIsCustom] = useState(false);

  const isPreset = presets.includes(value);

  function handlePreset(preset: string) {
    setIsCustom(false);
    onChange(preset);
  }

  function handleCustomFocus() {
    // Only clear the amount when the user is switching away from a preset.
    // If they tab through the custom field (or re-focus it while it is
    // already active) the existing value should be preserved so the tip
    // button stays enabled and the amount summary does not disappear.
    if (!isCustom) {
      setIsCustom(true);
      onChange("");
    }
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow only valid decimal input
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    // Prevent more than one decimal point
    const parts = raw.split(".");
    let clean  = parts.length > 2
      ? `${parts[0]}.${parts.slice(1).join("")}`
      : raw;
    // USDC on Stellar supports 7 decimal places — anything finer
    // cannot be represented, so prevent excess precision as the user types.
    if (clean.includes(".")) {
      const [whole, frac] = clean.split(".");
      clean = `${whole}.${frac.slice(0, 7)}`;
    }
    onChange(clean);
  }

  // Validate amount using the SDK helper, plus our own ceiling — the SDK
  // alone has no upper bound, and this is the one path a typo reaches.
  const amountValid = (() => {
    if (!value) return false;
    try {
      return isValidTipAmount(usdcToStroops(value)) && isWithinTipCeiling(value);
    } catch {
      return false;
    }
  })();
  const exceedsCeiling = isCustom && !!value && Number(value) > MAX_CUSTOM_TIP_USDC;

  const insufficientBalance = (() => {
    if (balance === null || !amountValid) return false;
    try {
      return usdcToStroops(value) > balance;
    } catch {
      return false;
    }
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-fg-muted">Amount (USDC)</p>
        {balance !== null && (
          <p className={cn("text-xs", insufficientBalance ? "text-danger" : "text-fg-faint")}>
            Balance: ${formatUsdc(balance, 2)}
          </p>
        )}
      </div>

      {/* Preset buttons */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${presets.length}, minmax(0, 1fr))` }}
      >
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => handlePreset(preset)}
            className={cn(
              "rounded-xl py-3 text-sm font-semibold transition-all duration-150",
              "border focus:outline-none focus:ring-2 focus:ring-brand-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              !isCustom && value === preset
                ? "bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/30"
                : "bg-surface-strong border-hairline text-fg-muted hover:bg-hairline hover:text-fg",
            )}
            aria-pressed={!isCustom && value === preset}
            aria-label={`Tip $${preset} USDC`}
          >
            ${preset}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle text-sm font-medium pointer-events-none">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Custom amount"
          disabled={disabled}
          value={isCustom ? value : ""}
          onFocus={handleCustomFocus}
          onChange={handleCustomChange}
          className={cn(
            "w-full rounded-xl bg-surface-strong border pl-8 pr-16 py-3 text-sm text-fg",
            "placeholder:text-fg-dim focus:outline-none focus:ring-2 transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            isCustom && value
              ? amountValid
                ? "border-brand-500/50 focus:ring-brand-500/40"
                : "border-danger/50 focus:ring-danger/30"
              : "border-hairline focus:ring-brand-500/40",
          )}
          aria-label="Enter custom tip amount"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-fg-faint pointer-events-none">
          USDC
        </span>
      </div>

      {/* Validation feedback */}
      {isCustom && value && !amountValid && (
        <p className="text-xs text-danger">
          {exceedsCeiling
            ? `Custom tips are capped at $${MAX_CUSTOM_TIP_USDC}`
            : "Enter a valid amount greater than 0"}
        </p>
      )}

      {/* Precision hint — shown whenever the custom field is active so the
          user understands why extra decimal digits are dropped automatically */}
      {isCustom && (
        <p className="text-xs text-fg-dim">
          USDC supports up to 7 decimal places.
        </p>
      )}
      {amountValid && insufficientBalance && (
        <p className="text-xs text-danger">
          That&apos;s more than your USDC balance.
        </p>
      )}

      {/* Selected amount summary */}
      {amountValid && !insufficientBalance && (
        <p className="text-xs text-fg-faint text-right">
          Sending{" "}
          <span className="text-accent font-semibold">${value} USDC</span>
        </p>
      )}
    </div>
  );
}
