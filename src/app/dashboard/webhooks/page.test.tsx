/**
 * src/app/dashboard/webhooks/page.test.tsx
 *
 * Tests covering:
 *   - Issue #206: Secret dismissal is scoped to the removed webhook and only triggers after removal succeeds.
 *   - Issue #207: Copying secret uses useCopyToClipboard and renders CopyFallback on copy failure.
 *   - Issue #208: List load error renders ErrorPanel with a retry control that refetches the list.
 *   - Issue #209: Webhook URL is trimmed before validation and before dispatching to webhookApi.create.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WebhooksPage from "./page";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const listMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const removeMock = vi.hoisted(() => vi.fn());
const rotateSecretMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const deliveriesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  webhookApi: {
    list: listMock,
    create: createMock,
    remove: removeMock,
    rotateSecret: rotateSecretMock,
    update: updateMock,
    deliveries: deliveriesMock,
  },
  ApiError: class ApiError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  },
  getErrorMessage: (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback),
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({ jwt: "mock-jwt" }),
}));

// We'll allow testing both copy success and copy failure
const copyMock = vi.hoisted(() => vi.fn());
const resetMock = vi.hoisted(() => vi.fn());
let mockCopyFailed = false;
let mockCopied = false;

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => ({
    copied: mockCopied,
    failed: mockCopyFailed,
    copy: copyMock,
    reset: resetMock,
  }),
}));

beforeEach(() => {
  mockCopyFailed = false;
  mockCopied = false;
  listMock.mockResolvedValue({
    webhooks: [
      { id: "hook-1", url: "https://example.com/webhook1", enabled: true },
      { id: "hook-2", url: "https://example.com/webhook2", enabled: true },
    ],
  });
  createMock.mockResolvedValue({
    webhook: {
      id: "hook-3",
      url: "https://example.com/webhook3",
      secret: "whsec_testsecret12345",
    },
  });
  removeMock.mockResolvedValue({ ok: true });
  rotateSecretMock.mockResolvedValue({ secret: "whsec_newrotatedsecret" });
  updateMock.mockResolvedValue({
    webhook: { id: "hook-1", url: "https://example.com/webhook1", enabled: false },
  });
  deliveriesMock.mockResolvedValue({ deliveries: [] });
  copyMock.mockImplementation(async () => !mockCopyFailed);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("WebhooksPage – Issue #208: List load error and retry control", () => {
  it("renders ErrorPanel with retry button on fetch failure and disables retry during request", async () => {
    let rejectFirst: ((err: Error) => void) | undefined;
    listMock.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectFirst = reject;
      }),
    );

    render(<WebhooksPage />);

    // Reject first request
    rejectFirst?.(new Error("Network connection dropped."));

    const errorMsg = await screen.findByText("Network connection dropped.");
    expect(errorMsg).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", {
      name: /retry loading this panel/i,
    });
    expect(retryBtn).toBeInTheDocument();

    // Now mock subsequent retry to hang while in-flight
    let resolveSecond: ((val: unknown) => void) | undefined;
    listMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecond = resolve;
      }),
    );

    const user = userEvent.setup();
    await user.click(retryBtn);

    // Verify retry button is disabled/retrying
    expect(retryBtn).toBeDisabled();

    // Resolve second request
    resolveSecond?.({
      webhooks: [{ id: "hook-1", url: "https://example.com/webhook1", enabled: true }],
    });

    await waitFor(() => {
      expect(screen.queryByText("Network connection dropped.")).not.toBeInTheDocument();
      expect(screen.getByText("https://example.com/webhook1")).toBeInTheDocument();
    });
  });
});

describe("WebhooksPage – Issue #209: URL trimming before validation and sending", () => {
  it("trims surrounding whitespace before validating and does not show an error", async () => {
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const input = screen.getByLabelText(/endpoint url/i);
    await user.type(input, "   https://example.com/webhook3   ");
    await user.tab(); // trigger blur

    expect(screen.queryByText("Must be a valid HTTPS URL")).not.toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: "Add webhook" });
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    expect(createMock).toHaveBeenCalledWith("mock-jwt", "https://example.com/webhook3");
  });
});

describe("WebhooksPage – Issue #206: One-time secret dismissal scoping", () => {
  it("keeps the new secret visible when removing a different webhook", async () => {
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    // Add a new webhook which reveals hook-3's secret
    const input = screen.getByLabelText(/endpoint url/i);
    await user.type(input, "https://example.com/webhook3");
    await user.click(screen.getByRole("button", { name: "Add webhook" }));

    // Verify secret is revealed
    await screen.findByText("whsec_testsecret12345");

    // Remove hook-1 (a different webhook)
    const removeBtn1 = screen.getByRole("button", {
      name: "Remove webhook https://example.com/webhook1",
    });
    await user.click(removeBtn1);

    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledWith("mock-jwt", "hook-1");
    });

    // The secret banner for hook-3 must still be visible!
    expect(screen.getByText("whsec_testsecret12345")).toBeInTheDocument();
    expect(
      screen.getByText("Save your signing secret — it will not be shown again"),
    ).toBeInTheDocument();
  });

  it("does not dismiss secret if the removal request fails", async () => {
    removeMock.mockRejectedValueOnce(new Error("Server error deleting webhook"));
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    // Register hook-3
    const input = screen.getByLabelText(/endpoint url/i);
    await user.type(input, "https://example.com/webhook3");
    await user.click(screen.getByRole("button", { name: "Add webhook" }));

    await screen.findByText("whsec_testsecret12345");

    // Attempt to remove hook-3, but it fails
    const removeBtn3 = screen.getByRole("button", {
      name: "Remove webhook https://example.com/webhook3",
    });
    await user.click(removeBtn3);

    await screen.findByText("Server error deleting webhook");
    // Secret must still be visible since deletion failed
    expect(screen.getByText("whsec_testsecret12345")).toBeInTheDocument();
  });

  it("dismisses secret only when its corresponding webhook is removed successfully", async () => {
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    // Register hook-3
    const input = screen.getByLabelText(/endpoint url/i);
    await user.type(input, "https://example.com/webhook3");
    await user.click(screen.getByRole("button", { name: "Add webhook" }));

    await screen.findByText("whsec_testsecret12345");

    // Successfully remove hook-3
    const removeBtn3 = screen.getByRole("button", {
      name: "Remove webhook https://example.com/webhook3",
    });
    await user.click(removeBtn3);

    await waitFor(() => {
      expect(screen.queryByText("whsec_testsecret12345")).not.toBeInTheDocument();
    });
  });
});

describe("WebhooksPage – Issue #207: Copying secret and CopyFallback", () => {
  it("calls copy handler when copy button is clicked", async () => {
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const input = screen.getByLabelText(/endpoint url/i);
    await user.type(input, "https://example.com/webhook3");
    await user.click(screen.getByRole("button", { name: "Add webhook" }));

    await screen.findByText("whsec_testsecret12345");

    const copyBtn = screen.getByRole("button", { name: "Copy signing secret" });
    await user.click(copyBtn);

    expect(copyMock).toHaveBeenCalledWith("whsec_testsecret12345");
  });

  it("shows CopyFallback when copy fails", async () => {
    mockCopyFailed = true;
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const input = screen.getByLabelText(/endpoint url/i);
    await user.type(input, "https://example.com/webhook3");
    await user.click(screen.getByRole("button", { name: "Add webhook" }));

    await screen.findByText("whsec_testsecret12345");

    // CopyFallback should be visible when mockCopyFailed is true
    expect(
      screen.getByText(
        /Couldn't copy automatically. Select the secret below and copy it manually./i,
      ),
    ).toBeInTheDocument();
  });
});

describe("WebhooksPage – Rotate secret flow", () => {
  it("shows confirmation dialog when rotate is clicked", async () => {
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const rotateBtn = screen.getByRole("button", {
      name: "Rotate secret for https://example.com/webhook1",
    });
    await user.click(rotateBtn);

    expect(screen.getByText("Rotate signing secret?")).toBeInTheDocument();
    expect(screen.getByText(/This will generate a new secret/i)).toBeInTheDocument();
    // The URL is also shown in the list behind the dialog, so look inside it.
    const dialog = screen.getByRole("dialog", { name: /Rotate signing secret/i });
    expect(within(dialog).getByText("https://example.com/webhook1")).toBeInTheDocument();
  });

  it("cancels rotation when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const rotateBtn = screen.getByRole("button", {
      name: "Rotate secret for https://example.com/webhook1",
    });
    await user.click(rotateBtn);

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelBtn);

    expect(screen.queryByText("Rotate signing secret?")).not.toBeInTheDocument();
    expect(rotateSecretMock).not.toHaveBeenCalled();
  });

  it("rotates secret successfully and shows new secret banner", async () => {
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const rotateBtn = screen.getByRole("button", {
      name: "Rotate secret for https://example.com/webhook1",
    });
    await user.click(rotateBtn);

    const confirmBtn = screen.getByRole("button", { name: "Rotate secret" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(rotateSecretMock).toHaveBeenCalledWith("mock-jwt", "hook-1");
    });

    expect(screen.getByText("whsec_newrotatedsecret")).toBeInTheDocument();
    expect(screen.getByText("New signing secret generated — save it now")).toBeInTheDocument();
    expect(screen.getByText(/The old secret is no longer valid/i)).toBeInTheDocument();
  });

  it("displays error message when rotation fails", async () => {
    rotateSecretMock.mockRejectedValueOnce(new Error("Failed to rotate secret"));
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const rotateBtn = screen.getByRole("button", {
      name: "Rotate secret for https://example.com/webhook1",
    });
    await user.click(rotateBtn);

    const confirmBtn = screen.getByRole("button", { name: "Rotate secret" });
    await user.click(confirmBtn);

    await screen.findByText("Failed to rotate secret");
    expect(screen.queryByText("whsec_newrotatedsecret")).not.toBeInTheDocument();
  });
});

describe("WebhooksPage – Toggle enabled/disabled flow", () => {
  it("toggles webhook from enabled to disabled successfully", async () => {
    updateMock.mockResolvedValueOnce({
      webhook: { id: "hook-1", url: "https://example.com/webhook1", enabled: false },
    });
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const activeBadge = screen.getAllByText("active")[0];
    await user.click(activeBadge);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith("mock-jwt", "hook-1", { enabled: false });
    });

    expect(screen.getByText("disabled")).toBeInTheDocument();
  });

  it("toggles webhook from disabled to enabled successfully", async () => {
    listMock.mockResolvedValueOnce({
      webhooks: [{ id: "hook-1", url: "https://example.com/webhook1", enabled: false }],
    });
    updateMock.mockResolvedValueOnce({
      webhook: { id: "hook-1", url: "https://example.com/webhook1", enabled: true },
    });
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const disabledBadge = screen.getByText("disabled");
    await user.click(disabledBadge);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith("mock-jwt", "hook-1", { enabled: true });
    });

    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("displays error message when toggle fails", async () => {
    updateMock.mockRejectedValueOnce(new Error("Server error updating webhook"));
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const activeBadge = screen.getAllByText("active")[0];
    await user.click(activeBadge);

    await screen.findByText("Server error updating webhook");
    // Should still show "active" since toggle failed
    expect(screen.getAllByText("active").length).toBeGreaterThan(0);
  });
});

describe("WebhooksPage – Deliveries list flow", () => {
  it("expands deliveries section and loads delivery list", async () => {
    deliveriesMock.mockResolvedValueOnce({
      deliveries: [
        {
          id: "delivery-1",
          status: 200,
          createdAt: new Date().toISOString(),
          attempt: 1,
        },
        {
          id: "delivery-2",
          status: 500,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          attempt: 2,
        },
      ],
    });
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const expandBtn = screen.getAllByRole("button", { name: "Show deliveries" })[0];
    await user.click(expandBtn);

    await waitFor(() => {
      expect(deliveriesMock).toHaveBeenCalledWith("mock-jwt", "hook-1");
    });

    expect(screen.getByText("Recent deliveries")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("(attempt 2)")).toBeInTheDocument();
  });

  it("shows empty state when no deliveries exist", async () => {
    deliveriesMock.mockResolvedValueOnce({ deliveries: [] });
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const expandBtn = screen.getAllByRole("button", { name: "Show deliveries" })[0];
    await user.click(expandBtn);

    await waitFor(() => {
      expect(deliveriesMock).toHaveBeenCalledWith("mock-jwt", "hook-1");
    });

    expect(
      screen.getByText(/No deliveries yet. This endpoint will receive a POST when a tip lands./i),
    ).toBeInTheDocument();
  });

  it("displays error when deliveries fetch fails", async () => {
    deliveriesMock.mockRejectedValueOnce(new Error("Failed to load delivery history"));
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const expandBtn = screen.getAllByRole("button", { name: "Show deliveries" })[0];
    await user.click(expandBtn);

    await screen.findByText("Failed to load delivery history");
    expect(screen.queryByText("Recent deliveries")).toBeInTheDocument();
  });

  it("collapses deliveries section when expanded button is clicked again", async () => {
    deliveriesMock.mockResolvedValueOnce({
      deliveries: [
        {
          id: "delivery-1",
          status: 200,
          createdAt: new Date().toISOString(),
          attempt: 1,
        },
      ],
    });
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await screen.findByText("https://example.com/webhook1");

    const expandBtn = screen.getAllByRole("button", { name: "Show deliveries" })[0];
    await user.click(expandBtn);

    await screen.findByText("Recent deliveries");

    const collapseBtn = screen.getAllByRole("button", { name: "Hide deliveries" })[0];
    await user.click(collapseBtn);

    await waitFor(() => {
      expect(screen.queryByText("Recent deliveries")).not.toBeInTheDocument();
    });
  });
});

