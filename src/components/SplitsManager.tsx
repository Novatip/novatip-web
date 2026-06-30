"use client";

/**
 * SplitsManager.tsx
 *
 * UI for managing collaborator splits on a tip jar.
 * Validates that all bps values sum to exactly 10,000 before
 * allowing the creator to save changes on-chain + backend.
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { validateSplitsBps } from "@novatip/sdk";
import { cn } from "@/lib/utils";

export interface SplitRow {
  to:  string;
  bps: number;
}

interface SplitsManagerProps {
  initial:    SplitRow[];
  onSave:     (splits: SplitRow[]) => Promise<void>;
  disabled?:  boolean;
}

export function SplitsManager({ initial, onSave, disabled = false }: SplitsManagerProps) {
  const [rows,    setRows]    = useState<SplitRow[]>(initial.length > 0 ? initial : [{ to: "", bps: 10000 }]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalBps    = rows.reduce((s, r) => s + (r.bps || 0), 0);
  const bpsValid    = validateSplitsBps(rows.map((r) => r.bps));
  const addressesOk = rows.every((r) => /^G[A-Z2-7]{55}$/.test(r.to));
  const canSave     = bpsValid && addressesOk && !saving && !disabled;

  function updateRow(index: number, field: keyof SplitRow, value: string) {
    setSuccess(false);
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, [field]: field === "bps" ? parseInt(value || "0", 10) : value }
          : row,
      ),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { to: "", bps: 0 }]);
  }

  function removeRow(index: number) {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await onSave(rows);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save splits.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Rows */}
      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">

            {/* Address */}
            <div className="flex-1 min-w-0">
              <Input
                placeholder="G... recipient address"
                value={row.to}
                onChange={(e) => updateRow(i, "to", e.target.value)}
                disabled={saving || disabled}
                aria-label={`Recipient ${i + 1} address`}
                error={
                  row.to && !/^G[A-Z2-7]{55}$/.test(row.to)
                    ? "Invalid Stellar address"
                    : undefined
                }
              />
            </div>

            {/* BPS input */}
            <div className="w-28 shrink-0">
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={row.bps || ""}
                  onChange={(e) => updateRow(i, "bps", e.target.value)}
                  disabled={saving || disabled}
                  placeholder="bps"
                  aria-label={`Recipient ${i + 1} basis points`}
                  className={cn(
                    "w-full rounded-xl bg-white/5 border border-white/10",
                    "px-3 pr-10 py-2.5 text-sm text-white text-right",
                    "focus:outline-none focus:ring-2 focus:ring-brand-500/50",
                    "disabled:opacity-50 transition-all duration-200",
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                  bps
                </span>
              </div>
              <p className="text-right text-xs text-gray-600 mt-1">
                {row.bps ? `${(row.bps / 100).toFixed(1)}%` : "0%"}
              </p>
            </div>

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={rows.length === 1 || saving || disabled}
              className="mt-2 text-gray-600 hover:text-red-400 disabled:opacity-30 transition-colors"
              aria-label={`Remove recipient ${i + 1}`}
            >
              ✕
            </button>

          </div>
        ))}
      </div>

      {/* Add row */}
      {rows.length < 20 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addRow}
          disabled={saving || disabled}
          className="self-start"
        >
          + Add collaborator
        </Button>
      )}

      {/* BPS total indicator */}
      <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <span className="text-sm text-gray-400">Total allocation</span>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-semibold font-mono",
            bpsValid ? "text-green-400" : totalBps > 10000 ? "text-red-400" : "text-yellow-400",
          )}>
            {totalBps.toLocaleString()} / 10,000 bps
          </span>
          <Badge variant={bpsValid ? "success" : "error"}>
            {bpsValid ? "100%" : `${(totalBps / 100).toFixed(1)}%`}
          </Badge>
        </div>
      </div>

      {/* Validation hint */}
      {!bpsValid && (
        <p className="text-xs text-yellow-400">
          Splits must sum to exactly 10,000 bps (100%).
          {totalBps < 10000
            ? ` Add ${(10000 - totalBps).toLocaleString()} more bps.`
            : ` Remove ${(totalBps - 10000).toLocaleString()} bps.`}
        </p>
      )}

      {/* Error / success */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-400">Splits saved successfully!</p>
      )}

      {/* Save */}
      <Button
        size="lg"
        className="w-full"
        disabled={!canSave}
        loading={saving}
        onClick={handleSave}
        aria-label="Save collaborator splits"
      >
        {saving ? "Saving…" : "Save splits"}
      </Button>

    </div>
  );
}
