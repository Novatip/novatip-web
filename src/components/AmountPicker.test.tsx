/**
 * src/components/AmountPicker.test.tsx
 *
 * Unit tests for AmountPicker.
 *
 * Covers:
 *   - Preset buttons render and fire onChange with the correct value
 *   - Clicking a preset marks it aria-pressed=true and clears the custom field
 *   - Custom input sanitises the value (strips non-numeric, collapses extra dots)
 *   - Validation message appears for an invalid custom amount
 *   - Disabled prop prevents interaction
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AmountPicker } from "./AmountPicker";

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup(value = "2", onChange = vi.fn()) {
  const result = render(<AmountPicker value={value} onChange={onChange} />);
  return { ...result, onChange };
}

// ── Preset buttons ────────────────────────────────────────────────────────────

describe("AmountPicker – preset buttons", () => {
  it("renders all five preset buttons", () => {
    setup();
    ["$1", "$2", "$5", "$10", "$25"].forEach((label) => {
      expect(screen.getByRole("button", { name: new RegExp(`Tip \\${label} USDC`, "i") })).toBeInTheDocument();
    });
  });

  it("marks the active preset as aria-pressed=true", () => {
    setup("5");
    expect(
      screen.getByRole("button", { name: /Tip \$5 USDC/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange with the preset value when clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = setup("2");
    await user.click(screen.getByRole("button", { name: /Tip \$10 USDC/i }));
    expect(onChange).toHaveBeenCalledWith("10");
  });

  it("does not call onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AmountPicker value="2" onChange={onChange} disabled />);
    await user.click(screen.getByRole("button", { name: /Tip \$5 USDC/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ── Custom input sanitisation ─────────────────────────────────────────────────

describe("AmountPicker – custom input sanitisation", () => {
  it("strips non-numeric characters", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AmountPicker value="" onChange={onChange} />);

    const input = screen.getByLabelText(/enter custom tip amount/i);
    await user.click(input); // focus → setIsCustom(true) and onChange("")
    onChange.mockClear();

    // Simulate typing "ab3" — only "3" should reach onChange
    fireEvent.change(input, { target: { value: "ab3" } });
    expect(onChange).toHaveBeenCalledWith("3");
  });

  it("collapses multiple decimal points", () => {
    const onChange = vi.fn();
    render(<AmountPicker value="" onChange={onChange} />);
    const input = screen.getByLabelText(/enter custom tip amount/i);

    fireEvent.change(input, { target: { value: "1.2.3" } });
    // "1.2.3" → parts: ["1","2","3"] → "1." + "23" = "1.23"
    expect(onChange).toHaveBeenCalledWith("1.23");
  });

  it("allows a clean decimal value through unchanged", () => {
    const onChange = vi.fn();
    render(<AmountPicker value="" onChange={onChange} />);
    const input = screen.getByLabelText(/enter custom tip amount/i);

    fireEvent.change(input, { target: { value: "3.50" } });
    expect(onChange).toHaveBeenCalledWith("3.50");
  });

  it("shows validation error for a zero amount", () => {
    // isCustom=true means we need to have focused the field first;
    // render with a state that simulates custom + invalid value by clicking
    // the custom field and checking error after a bad value
    const { rerender } = render(<AmountPicker value="" onChange={vi.fn()} />);
    const input = screen.getByLabelText(/enter custom tip amount/i);
    fireEvent.focus(input);

    rerender(<AmountPicker value="0" onChange={vi.fn()} />);
    // The validation message should appear
    expect(
      screen.getByText(/enter a valid amount greater than 0/i),
    ).toBeInTheDocument();
  });

  it("shows the summary line for a valid amount", () => {
    render(<AmountPicker value="5" onChange={vi.fn()} />);
    expect(screen.getByText(/\$5 USDC/i)).toBeInTheDocument();
  });
});
