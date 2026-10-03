/**
 * src/components/onboarding/StepIndicator.test.tsx
 *
 * Unit tests for StepIndicator.
 *
 * Covers:
 *   - A step before currentStep renders as "done" (checkmark + filled style)
 *   - The step at currentStep renders as "active" with aria-current="step"
 *   - A step after currentStep renders as "upcoming" (its number, no aria-current)
 *   - Exactly one step carries aria-current, regardless of position
 *   - The connector between steps is not rendered after the last step
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StepIndicator } from "./StepIndicator";

afterEach(cleanup);

const LABELS = ["Connect", "Splits", "Share"];

// The step circle is the only descendant with an h-8 (fixed height) class —
// the connector is h-0.5, and the outer wrapper divs set no height at all —
// so this reliably targets the circle rather than an ancestor wrapper.
function circleOf(step: HTMLElement): HTMLElement {
  return step.querySelector('[class*="h-8"]') as HTMLElement;
}

describe("StepIndicator – step states", () => {
  it("renders a step before currentStep as done, with a checkmark", () => {
    render(<StepIndicator currentStep={1} totalSteps={3} labels={LABELS} />);

    const steps = screen.getAllByRole("listitem");
    const circle = circleOf(steps[0]);
    expect(circle).toHaveTextContent("✓");
    expect(circle).toHaveClass("bg-brand-500", "border-brand-500", "text-white");
    expect(circle).not.toHaveAttribute("aria-current");
  });

  it('renders the step at currentStep as active, with aria-current="step"', () => {
    render(<StepIndicator currentStep={1} totalSteps={3} labels={LABELS} />);

    const steps = screen.getAllByRole("listitem");
    const circle = circleOf(steps[1]);
    expect(circle).toHaveAttribute("aria-current", "step");
    expect(circle).toHaveTextContent("2"); // i + 1
    expect(circle).toHaveClass("border-brand-500", "text-accent");
  });

  it("renders a step after currentStep as upcoming — its number, no aria-current", () => {
    render(<StepIndicator currentStep={1} totalSteps={3} labels={LABELS} />);

    const steps = screen.getAllByRole("listitem");
    const circle = circleOf(steps[2]);
    expect(circle).not.toHaveAttribute("aria-current");
    expect(circle).toHaveTextContent("3"); // i + 1
    expect(circle).toHaveClass("border-hairline-strong", "text-fg-dim");
  });
});

describe("StepIndicator – aria-current uniqueness", () => {
  it("marks exactly one step with aria-current, at the first step", () => {
    const { container } = render(
      <StepIndicator currentStep={0} totalSteps={3} labels={LABELS} />,
    );
    expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
    expect(container.querySelector("[aria-current]")).toHaveAttribute("aria-current", "step");
  });

  it("marks exactly one step with aria-current, at the last step", () => {
    const { container } = render(
      <StepIndicator currentStep={2} totalSteps={3} labels={LABELS} />,
    );
    expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("marks exactly one step with aria-current in the middle of the flow", () => {
    const { container } = render(
      <StepIndicator currentStep={1} totalSteps={3} labels={LABELS} />,
    );
    expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
  });
});

describe("StepIndicator – connector", () => {
  it("renders a connector after every step except the last", () => {
    render(<StepIndicator currentStep={1} totalSteps={3} labels={LABELS} />);
    const steps = screen.getAllByRole("listitem");

    // Each non-last step wraps the circle/label column plus a connector —
    // two children. The last step has no connector, so just the column.
    expect(steps[0].children).toHaveLength(2);
    expect(steps[1].children).toHaveLength(2);
    expect(steps[2].children).toHaveLength(1);
  });

  it("renders exactly totalSteps - 1 connectors", () => {
    const { container } = render(
      <StepIndicator currentStep={1} totalSteps={4} labels={["A", "B", "C", "D"]} />,
    );
    // Connectors are the only elements carrying this rounded-pill height class.
    expect(container.querySelectorAll('[class*="h-0.5"]')).toHaveLength(3);
  });
});
