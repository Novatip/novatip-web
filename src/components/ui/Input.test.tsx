/**
 * src/components/ui/Input.test.tsx
 *
 * Unit tests for Input.
 *
 * Covers:
 *   - Two inputs with the same label get distinct ids (no duplicate id bug)
 *   - An explicitly passed id wins over the generated one
 */

import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Input } from "./Input";

afterEach(cleanup);

// ── Id uniqueness ─────────────────────────────────────────────────────────────

describe("Input – id generation", () => {
  it("gives two inputs with the same label distinct ids", () => {
    render(
      <>
        <Input label="Email" />
        <Input label="Email" />
      </>,
    );

    const [first, second] = screen.getAllByRole("textbox");
    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
  });

  it("uses an explicitly passed id instead of generating one", () => {
    render(<Input label="Email" id="my-email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "my-email");
  });

  it("links the label to the input via the generated id", () => {
    render(<Input label="Username" />);
    // getByLabelText throws if the label and input are not properly linked
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });
});
