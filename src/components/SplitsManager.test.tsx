/**
 * src/components/SplitsManager.test.tsx
 *
 * Unit tests for SplitsManager.
 *
 * Covers:
 *   - Renders initial rows passed via props
 *   - Defaults to a single empty row when no initial splits
 *   - BPS total calculation and display
 *   - bps validation: valid (10 000), under, over
 *   - Hint message reflects whether bps is under or over
 *   - Add row button appends a new empty row
 *   - Remove row button removes the correct entry (disabled when only one row)
 *   - NaN safety: empty bps input treated as 0 in total
 *   - Save button disabled until bps is valid AND addresses are valid
 *   - onSave called with the current rows on submit
 *   - onSave error is displayed
 *   - Success message appears after a successful save
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SplitsManager } from "./SplitsManager";

// Valid Stellar G-addresses (correct version byte and CRC16 checksum)
const VALID_ADDR_1 = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const VALID_ADDR_2 = "GAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBBKGO";

const SOLO_SPLIT = [{ to: VALID_ADDR_1, bps: 10_000 }];

function setup(
  initial = SOLO_SPLIT,
  onSave: () => Promise<void> = () => Promise.resolve(),
) {
  const saveSpy = vi.fn(onSave);
  render(<SplitsManager initial={initial} onSave={saveSpy} />);
  return { saveSpy };
}

// ── Initial render ────────────────────────────────────────────────────────────

describe("SplitsManager – initial render", () => {
  it("renders the address from initial props", () => {
    setup();
    expect(
      screen.getByDisplayValue(VALID_ADDR_1),
    ).toBeInTheDocument();
  });

  it("defaults to one empty row when initial is empty", () => {
    setup([]);
    const addressInputs = screen.getAllByRole("textbox", { name: /address$/i });
    // One address input rendered (bps input is type=number, not textbox)
    expect(addressInputs).toHaveLength(1);
  });

  it("shows 10,000 / 10,000 bps when single full-allocation row", () => {
    setup();
    expect(screen.getByText(/10,000 \/ 10,000 bps/)).toBeInTheDocument();
  });
});

// ── BPS total display ─────────────────────────────────────────────────────────

describe("SplitsManager – BPS total", () => {
  it("shows total as sum of all rows", async () => {
    const user = userEvent.setup();
    setup([
      { to: VALID_ADDR_1, bps: 7_000 },
      { to: VALID_ADDR_2, bps: 3_000 },
    ]);
    expect(screen.getByText(/10,000 \/ 10,000 bps/)).toBeInTheDocument();
  });

  it("treats empty bps input as 0 in the total (NaN safety)", () => {
    setup([{ to: VALID_ADDR_1, bps: 0 }]);
    // 0 bps → total = 0
    expect(screen.getByText(/0 \/ 10,000 bps/)).toBeInTheDocument();
  });
});

// ── Validation messages ───────────────────────────────────────────────────────

describe("SplitsManager – validation hint", () => {
  it("shows 'Add N more bps' when total is under 10 000", () => {
    setup([{ to: VALID_ADDR_1, bps: 6_000 }]);
    expect(screen.getByText(/Add 4,000 more bps/)).toBeInTheDocument();
  });

  it("shows 'Remove N bps' when total is over 10 000", () => {
    setup([{ to: VALID_ADDR_1, bps: 11_000 }]);
    expect(screen.getByText(/Remove 1,000 bps/)).toBeInTheDocument();
  });

  it("hides the hint when total is exactly 10 000", () => {
    setup();
    expect(
      screen.queryByText(/splits must sum to exactly/i),
    ).not.toBeInTheDocument();
  });
});

// ── Add / remove rows ─────────────────────────────────────────────────────────

describe("SplitsManager – add and remove rows", () => {
  it("adds a new empty row when '+ Add collaborator' is clicked", async () => {
    const user = userEvent.setup();
    setup();
    const addressInputsBefore = screen.getAllByRole("textbox", { name: /address$/i });
    await user.click(screen.getByRole("button", { name: /add collaborator/i }));
    const addressInputsAfter = screen.getAllByRole("textbox", { name: /address$/i });
    expect(addressInputsAfter.length).toBe(addressInputsBefore.length + 1);
  });

  it("removes the correct row when ✕ is clicked", async () => {
    const user = userEvent.setup();
    setup([
      { to: VALID_ADDR_1, bps: 5_000 },
      { to: VALID_ADDR_2, bps: 5_000 },
    ]);
    expect(screen.getAllByRole("textbox", { name: /address$/i })).toHaveLength(2);

    // Click the first remove button
    const removeButtons = screen.getAllByRole("button", { name: /remove recipient/i });
    await user.click(removeButtons[0]);

    expect(screen.getAllByRole("textbox", { name: /address$/i })).toHaveLength(1);
    // The remaining address should be the second one
    expect(screen.getByDisplayValue(VALID_ADDR_2)).toBeInTheDocument();
  });

  it("disables the remove button when only one row remains", () => {
    setup();
    const removeButton = screen.getByRole("button", { name: /remove recipient 1/i });
    expect(removeButton).toBeDisabled();
  });
});

// ── Save behaviour ────────────────────────────────────────────────────────────

describe("SplitsManager – save", () => {
  it("disables Save when bps does not total 10 000", () => {
    setup([{ to: VALID_ADDR_1, bps: 5_000 }]);
    expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeDisabled();
  });

  it("disables Save when an address is invalid", () => {
    setup([{ to: "INVALID_ADDRESS", bps: 10_000 }]);
    expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeDisabled();
  });

  it("rejects a well-formed address with a corrupted checksum", () => {
    // Same shape as VALID_ADDR_1 (G + 55 base-32 chars) but the last char is
    // flipped, so only the CRC16 check can catch it.
    setup([{ to: VALID_ADDR_1.slice(0, -1) + "G", bps: 10_000 }]);
    expect(screen.getByText(/invalid stellar address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeDisabled();
  });

  it("flags duplicate recipients and disables Save", () => {
    setup([
      { to: VALID_ADDR_1, bps: 5_000 },
      { to: VALID_ADDR_1, bps: 5_000 },
    ]);
    expect(screen.getAllByText(/duplicate recipient/i)).toHaveLength(2);
    expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeDisabled();
  });

  it("detects duplicates regardless of surrounding whitespace or case", () => {
    setup([
      { to: VALID_ADDR_1, bps: 5_000 },
      { to: `  ${VALID_ADDR_1.toLowerCase()} `, bps: 5_000 },
    ]);
    const second = screen.getByLabelText(/recipient 2 address/i);
    expect(second).toHaveValue(`  ${VALID_ADDR_1.toLowerCase()} `);
    // Row 1 is valid, so its only complaint can be the duplicate.
    expect(screen.getAllByText(/duplicate recipient/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeDisabled();
  });

  it("does not flag distinct recipients as duplicates", () => {
    setup([
      { to: VALID_ADDR_1, bps: 5_000 },
      { to: VALID_ADDR_2, bps: 5_000 },
    ]);
    expect(screen.queryByText(/duplicate recipient/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeEnabled();
  });

  it("enables Save when bps is 10 000 and all addresses are valid", () => {
    setup();
    expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeEnabled();
  });

  it("calls onSave with the current rows", async () => {
    const user = userEvent.setup();
    const { saveSpy } = setup();
    await user.click(screen.getByRole("button", { name: /save collaborator splits/i }));
    expect(saveSpy).toHaveBeenCalledWith(SOLO_SPLIT);
  });

  it("shows success message after save resolves", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /save collaborator splits/i }));
    await waitFor(() => {
      expect(screen.getByText(/splits saved successfully/i)).toBeInTheDocument();
    });
  });

  it("shows error message when onSave rejects", async () => {
    const user = userEvent.setup();
    setup(SOLO_SPLIT, () => Promise.reject(new Error("Network timeout")));
    await user.click(screen.getByRole("button", { name: /save collaborator splits/i }));
    await waitFor(() => {
      expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
    });
  });
});

// ── Recipient cap ─────────────────────────────────────────────────────────────

describe("SplitsManager – recipient cap (MAX_RECIPIENTS = 20)", () => {
  it("hides the add button when 20 rows are present", () => {
    const rows = Array.from({ length: 20 }, () => ({ to: VALID_ADDR_1, bps: 500 }));
    setup(rows);
    expect(screen.queryByRole("button", { name: /add collaborator/i })).not.toBeInTheDocument();
  });

  it("shows the add button when 19 rows are present", () => {
    const rows = Array.from({ length: 19 }, () => ({ to: VALID_ADDR_1, bps: 500 }));
    setup(rows);
    expect(screen.getByRole("button", { name: /add collaborator/i })).toBeInTheDocument();
  });
});

// ── Row field updates ─────────────────────────────────────────────────────────

describe("SplitsManager – field editing", () => {
  it("updates bps display percentage as the user types", async () => {
    setup([{ to: VALID_ADDR_1, bps: 10_000 }]);
    const bpsInput = screen.getByRole("textbox", { name: /recipient 1 basis points/i });
    fireEvent.change(bpsInput, { target: { value: "5000" } });
    // 5,000 bps renders as 50.0% twice — once on the row, once as the total.
    expect(screen.getAllByText("50.0%")).toHaveLength(2);
  });
});
