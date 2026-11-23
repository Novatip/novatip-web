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
 *   - A custom presets prop replaces the default list
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
      expect(
        screen.getByRole("button", { name: new RegExp(`Tip \\${label} USDC`, "i") }),
      ).toBeInTheDocument();
    });
  });

  it("marks the active preset as aria-pressed=true", () => {
    setup("5");
    expect(screen.getByRole("button", { name: /Tip \$5 USDC/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
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

describe("AmountPicker – restored amount", () => {
  it("shows a restored non-preset amount in the custom field", () => {
    const onChange = vi.fn();
    const { rerender } = render(<AmountPicker value="2" onChange={onChange} />);

    rerender(<AmountPicker value="3.5" onChange={onChange} />);

    expect(screen.getByRole("textbox", { name: /enter custom tip amount/i })).toHaveValue("3.5");
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });

  it("highlights a restored preset and leaves the custom field empty", () => {
    const onChange = vi.fn();
    const { rerender } = render(<AmountPicker value="3.5" onChange={onChange} />);

    rerender(<AmountPicker value="5" onChange={onChange} />);

    expect(screen.getByRole("button", { name: /Tip \$5 USDC/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("textbox", { name: /enter custom tip amount/i })).toHaveValue("");
  });
});

// ── Custom input sanitisation ─────────────────────────────────────────────────

describe("AmountPicker – custom input sanitisation", () => {
  it("strips non-numeric characters", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AmountPicker value="" onChange={onChange} />);

    const input = screen.getByLabelText(/enter custom tip amount/i);
    await user.click(input);
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
    // A non-preset value is custom even when supplied after the first render.
    const { rerender } = render(<AmountPicker value="" onChange={vi.fn()} />);
    rerender(<AmountPicker value="0" onChange={vi.fn()} />);
    // The validation message should appear
    expect(screen.getByText(/enter a valid amount greater than 0/i)).toBeInTheDocument();
  });

  it("shows the summary line for a valid amount", () => {
    render(<AmountPicker value="5" onChange={vi.fn()} />);
    expect(screen.getByText(/\$5 USDC/i)).toBeInTheDocument();
  });
});

// ── Configurable presets ──────────────────────────────────────────────────────

describe("AmountPicker – configurable presets", () => {
  it("renders a custom preset list instead of the default one", () => {
    render(<AmountPicker value="3" onChange={vi.fn()} presets={["3", "7", "15"]} />);

    ["$3", "$7", "$15"].forEach((label) => {
      expect(
        screen.getByRole("button", { name: new RegExp(`Tip \\${label} USDC`, "i") }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Tip \$25 USDC/i })).not.toBeInTheDocument();
  });

  it("calls onChange with a value from the custom preset list when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AmountPicker value="3" onChange={onChange} presets={["3", "7", "15"]} />);

    await user.click(screen.getByRole("button", { name: /Tip \$15 USDC/i }));

    expect(onChange).toHaveBeenCalledWith("15");
  });

  it("marks a custom preset active by the same rule as the default list", () => {
    render(<AmountPicker value="7" onChange={vi.fn()} presets={["3", "7", "15"]} />);
    expect(screen.getByRole("button", { name: /Tip \$7 USDC/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("falls back to the default list when no presets prop is given", () => {
    setup();
    expect(screen.getByRole("button", { name: /Tip \$25 USDC/i })).toBeInTheDocument();
  });
});
