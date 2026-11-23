/**
 * src/components/onboarding/SlugStep.test.tsx
 *
 * Covers the availability check's failure handling:
 *   - A failed check shows a message and a retry action; retrying re-runs it
 *   - An aborted check shows nothing
 *
 * And the reserved-slug handling:
 *   - A reserved slug shows Reserved and makes no request
 *   - A normal slug is still checked and shows Available
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  checkSlug: vi.fn(),
  readJar: vi.fn(),
}));

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    ApiError,
    creatorApi: { checkSlug: mocks.checkSlug, claim: vi.fn() },
  };
});

vi.mock("@/lib/jar", () => ({
  jarIdForSlug: (slug: string) => slug,
  readJar: mocks.readJar,
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({ publicKey: "GOWNER" }),
}));

import { ApiError } from "@/lib/api";
import { SlugStep } from "./SlugStep";

async function typeSlug(value: string) {
  fireEvent.change(screen.getByLabelText("Choose your slug"), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.readJar.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("SlugStep – availability check failure", () => {
  it("shows a message and a retry action when the check fails", async () => {
    mocks.checkSlug.mockRejectedValue(new ApiError(504, "TIMEOUT", "timed out"));
    render(<SlugStep jwt="jwt" onNext={vi.fn()} />);

    await typeSlug("ada");

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn.t check whether this slug is available/i,
    );
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /claim @ada/i })).toBeDisabled();
  });

  it("re-runs the check when Try again is pressed", async () => {
    mocks.checkSlug.mockRejectedValueOnce(new Error("rpc down"));
    mocks.checkSlug.mockResolvedValueOnce({ available: true });
    render(<SlugStep jwt="jwt" onNext={vi.fn()} />);

    await typeSlug("ada");
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mocks.checkSlug).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/available/i)).toBeInTheDocument();
  });

  it("shows nothing when the check is aborted", async () => {
    mocks.checkSlug.mockRejectedValue(new ApiError(0, "ABORTED", "aborted"));
    render(<SlugStep jwt="jwt" onNext={vi.fn()} />);

    await typeSlug("ada");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });
});

describe("SlugStep – reserved slugs", () => {
  it("shows Reserved and makes no request for a reserved slug", async () => {
    render(<SlugStep jwt="jwt" onNext={vi.fn()} />);

    await typeSlug("dashboard");

    expect(screen.getByText("Reserved")).toBeInTheDocument();
    expect(screen.queryByText(/taken/i)).not.toBeInTheDocument();
    expect(mocks.checkSlug).not.toHaveBeenCalled();
    expect(mocks.readJar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /claim @dashboard/i })).toBeDisabled();
  });

  it("still checks a normal slug and shows Available", async () => {
    mocks.checkSlug.mockResolvedValue({ available: true });
    render(<SlugStep jwt="jwt" onNext={vi.fn()} />);

    await typeSlug("ada");

    expect(mocks.checkSlug).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Reserved")).not.toBeInTheDocument();
    expect(screen.getByText(/available/i)).toBeInTheDocument();
  });
});
