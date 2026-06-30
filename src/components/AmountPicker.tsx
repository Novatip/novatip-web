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
import { isValidTipAmount, usdcToStroops } from "@novatip/sdk";

const PRESETS = ["1", "2", "5", "10", "25"];

interface AmountPickerProps {
  value:     string;
  onChange:  (value: string) => void;
  disabled?: boolean;
}

export function AmountPicker({ value, onChange, disabled = false }: AmountPickerProps) {
  const [isCustom, setIsCustom] = useState(false);

  const isPreset = PRESETS.includes(value);

  function handlePreset(preset: string) {
    setIsCustom(false);
    onChange(preset);
  }

  function handleCustomFocus() {
    setIsCustom(true);
    onChange("");
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow only valid decimal input
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    // Prevent more than one decimal point
    const parts = raw.split(".");
    const clean  = parts.length > 2
      ? `${parts[0]}.${parts.slice(1).join("")}`
      : raw;
    onChange(clean);
  }

  // Validate amount using SDK helper
  const amountValid = (() => {
    if (!value) return false;
    try {
      return isValidTipAmount(usdcToStroops(value));
    } catch {
      return false;
    }
  })();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-300">Amount (USDC)</p>

      {/* Preset buttons */}
      <div className="grid grid-cols-5 gap-2">
        {PRESETS.map((preset) => (
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
                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white",
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
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
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
            "w-full rounded-xl bg-white/5 border pl-8 pr-16 py-3 text-sm text-white",
            "placeholder:text-gray-600 focus:outline-none focus:ring-2 transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            isCustom && value
              ? amountValid
                ? "border-brand-500/50 focus:ring-brand-500/40"
                : "border-red-500/50 focus:ring-red-500/30"
              : "border-white/10 focus:ring-brand-500/40",
          )}
          aria-label="Enter custom tip amount"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
          USDC
        </span>
      </div>

      {/* Validation feedback */}
      {isCustom && value && !amountValid && (
        <p className="text-xs text-red-400">
          Enter a valid amount greater than 0
        </p>
      )}

      {/* Selected amount summary */}
      {amountValid && (
        <p className="text-xs text-gray-500 text-right">
          Sending{" "}
          <span className="text-brand-400 font-semibold">${value} USDC</span>
        </p>
      )}
    </div>
  );
}
