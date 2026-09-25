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
import { StrKey } from "@stellar/stellar-sdk";
import { cn } from "@/lib/utils";

export interface SplitRow {
  to:  string;
  bps: number;
}

// Rows carry a client-only id so React can key on stable identity instead of
// array index. It never leaves the component — see handleSave, which strips
// it before calling onSave. bps is kept as the raw string the user typed,
// not parsed until save, so an unparseable entry can never collapse into
// NaN in state.
interface SplitRowState {
  id:  string;
  to:  string;
  bps: string;
}

// StrKey checks the version byte and CRC16 checksum, not just the alphabet, so
// a typo'd address that merely looks right is rejected before it reaches a jar.
// (The SDK's isValidAccountId is still a shape-only regex.)
function isValidAddress(address: string): boolean {
  return StrKey.isValidEd25519PublicKey(address);
}

// Addresses are compared trimmed and upper-cased so stray whitespace or a
// lower-cased paste can't hide a duplicate.
function normalizeAddress(address: string): string {
  return address.trim().toUpperCase();
}

function withId(row: SplitRow): SplitRowState {
  return { id: crypto.randomUUID(), to: row.to, bps: String(row.bps) };
}

// Only a plain non-negative integer string counts as a valid bps entry —
// null covers both "still empty" (mid-typing) and genuinely invalid input.
function parseBpsInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

interface SplitsManagerProps {
  initial:    SplitRow[];
  onSave:     (splits: SplitRow[]) => Promise<void>;
  disabled?:  boolean;
}

export function SplitsManager({ initial, onSave, disabled = false }: SplitsManagerProps) {
  const [rows,    setRows]    = useState<SplitRowState[]>(
    (initial.length > 0 ? initial : [{ to: "", bps: 10000 }]).map(withId),
  );
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const parsedBps   = rows.map((r) => parseBpsInput(r.bps));
  const totalBps    = parsedBps.reduce<number>((s, v) => s + (v ?? 0), 0);
  const bpsValid    = parsedBps.every((v) => v !== null) && validateSplitsBps(parsedBps as number[]);
  const addressesOk = rows.every((r) => isValidAddress(r.to));
  // The contract rejects a jar that lists the same recipient twice
  // (DuplicateRecipient), so duplicates block saving rather than just warn.
  const addressCounts = rows.reduce<Map<string, number>>((counts, r) => {
    const key = normalizeAddress(r.to);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map());
  const isDuplicate   = rows.map((r) => (addressCounts.get(normalizeAddress(r.to)) ?? 0) > 1);
  const hasDuplicates = isDuplicate.some(Boolean);
  const canSave       = bpsValid && addressesOk && !hasDuplicates && !saving && !disabled;

  function updateRow(index: number, field: keyof SplitRow, value: string) {
    setSuccess(false);
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), to: "", bps: "" }]);
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
      // The id is a client-only React key, and bps is parsed from the raw
      // input here (canSave already guarantees every row parses cleanly) —
      // the backend and contract only ever expect finite integer { to, bps }.
      await onSave(rows.map((row) => ({ to: row.to, bps: parseBpsInput(row.bps)! })));
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
          <div key={row.id} className="flex items-start gap-2">

            {/* Address */}
            <div className="flex-1 min-w-0">
              <Input
                placeholder="G... recipient address"
                value={row.to}
                onChange={(e) => updateRow(i, "to", e.target.value)}
                disabled={saving || disabled}
                aria-label={`Recipient ${i + 1} address`}
                error={
                  row.to && !isValidAddress(row.to)
                    ? "Invalid Stellar address"
                    : isDuplicate[i]
                      ? "Duplicate recipient — this address is already listed"
                      : undefined
                }
              />
            </div>

            {/* BPS input */}
            <div className="w-28 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={row.bps}
                  onChange={(e) => updateRow(i, "bps", e.target.value)}
                  disabled={saving || disabled}
                  placeholder="bps"
                  aria-label={`Recipient ${i + 1} basis points`}
                  aria-invalid={row.bps !== "" && parsedBps[i] === null}
                  className={cn(
                    "w-full rounded-xl bg-surface-strong border",
                    row.bps !== "" && parsedBps[i] === null ? "border-danger" : "border-hairline",
                    "px-3 pr-10 py-2.5 text-sm text-fg text-right",
                    "focus:outline-none focus:ring-2 focus:ring-brand-500/50",
                    "disabled:opacity-50 transition-all duration-200",
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-faint pointer-events-none">
                  bps
                </span>
              </div>
              <p
                className={cn(
                  "text-right text-xs mt-1",
                  row.bps !== "" && parsedBps[i] === null ? "text-danger" : "text-fg-dim",
                )}
              >
                {row.bps !== "" && parsedBps[i] === null
                  ? "Whole number only"
                  : parsedBps[i] !== null
                    ? `${(parsedBps[i]! / 100).toFixed(1)}%`
                    : "0%"}
              </p>
            </div>

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={rows.length === 1 || saving || disabled}
              className="mt-2 text-fg-dim hover:text-danger disabled:opacity-30 transition-colors"
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
      <div className="flex items-center justify-between rounded-xl bg-surface-strong border border-hairline px-4 py-3">
        <span className="text-sm text-fg-subtle">Total allocation</span>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-semibold font-mono",
            bpsValid ? "text-success" : totalBps > 10000 ? "text-danger" : "text-warning",
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
        <p className="text-xs text-warning">
          Splits must sum to exactly 10,000 bps (100%).
          {totalBps < 10000
            ? ` Add ${(10000 - totalBps).toLocaleString()} more bps.`
            : ` Remove ${(totalBps - 10000).toLocaleString()} bps.`}
        </p>
      )}

      {hasDuplicates && (
        <p className="text-xs text-warning">
          Each recipient can only appear once. Merge duplicate rows into a single
          share before saving.
        </p>
      )}

      {/* Error / success */}
      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}
      {success && (
        <p className="text-sm text-success">Splits saved successfully!</p>
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
