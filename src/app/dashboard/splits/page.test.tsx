/**
 * src/app/dashboard/splits/page.test.tsx
 *
 * Unit tests for the splits page save ordering.
 *
 * Covers:
 *   - The on-chain sync is called before the backend update
 *   - A failed sync never calls the backend
 *   - A successful save updates the displayed splits
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SplitsPage from "./page";

const mockWallet = vi.hoisted(() => ({
  publicKey:    "GD7UXR3IX276M2M4XUE3TPNKTA7PJTERTEDEGWELQQYQBBHDL2NTREFR",
  jwt:          "mock.jwt.token",
  isConnected:  true,
  isConnecting: false,
  isSigningIn:  false,
  error:        null as string | null,
  connect:      vi.fn(),
  retrySignIn:  vi.fn(),
  disconnect:   vi.fn(),
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => mockWallet,
}));

const mockAuthApi = vi.hoisted(() => ({
  me: vi.fn(),
}));

const mockCreatorApi = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  updateSplits: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  authApi: mockAuthApi,
  creatorApi: mockCreatorApi,
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

const mockSyncJarToChain = vi.hoisted(() => vi.fn());

vi.mock("@/lib/jar", () => ({
  syncJarToChain: mockSyncJarToChain,
}));

const MOCK_CREATOR = {
  slug: "testcreator",
  jarId: "@testcreator",
  splits: [
    { to: "GD7UXR3IX276M2M4XUE3TPNKTA7PJTERTEDEGWELQQYQBBHDL2NTREFR", bps: 10000 },
  ],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockWallet.publicKey = "GD7UXR3IX276M2M4XUE3TPNKTA7PJTERTEDEGWELQQYQBBHDL2NTREFR";
  mockWallet.jwt = "mock.jwt.token";
  mockAuthApi.me.mockResolvedValue({ user: { slug: "testcreator" } });
  mockCreatorApi.getBySlug.mockResolvedValue({ creator: MOCK_CREATOR });
});

describe("SplitsPage – save ordering", () => {
  it("calls the on-chain sync before the backend update", async () => {
    const callOrder: string[] = [];

    mockSyncJarToChain.mockImplementation(async () => {
      callOrder.push("on-chain");
    });

    mockCreatorApi.updateSplits.mockImplementation(async () => {
      callOrder.push("backend");
      return { creator: MOCK_CREATOR };
    });

    render(<SplitsPage />);

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByRole("button", { name: /save collaborator splits/i });
    await userEvent.click(saveButton);

    // Wait for save to complete
    await waitFor(() => {
      expect(callOrder).toEqual(["on-chain", "backend"]);
    });

    expect(mockSyncJarToChain).toHaveBeenCalledTimes(1);
    expect(mockCreatorApi.updateSplits).toHaveBeenCalledTimes(1);
  });

  it("does not call the backend when the on-chain sync fails", async () => {
    mockSyncJarToChain.mockRejectedValue(new Error("Contract error: JarNotFound"));

    render(<SplitsPage />);

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByRole("button", { name: /save collaborator splits/i });
    await userEvent.click(saveButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/contract error/i)).toBeInTheDocument();
    });

    expect(mockSyncJarToChain).toHaveBeenCalledTimes(1);
    expect(mockCreatorApi.updateSplits).not.toHaveBeenCalled();
  });

  it("updates the displayed splits after a successful save", async () => {
    const updatedSplits = [
      { to: "GD7UXR3IX276M2M4XUE3TPNKTA7PJTERTEDEGWELQQYQBBHDL2NTREFR", bps: 5000 },
      { to: "GCB6PYGTNPFCHUXULHSVCTITYXPUB4Y6JKW2GSJ5C2WL5CRQBY5GUBNR", bps: 5000 },
    ];

    const updatedCreator = {
      ...MOCK_CREATOR,
      splits: updatedSplits,
    };

    mockSyncJarToChain.mockResolvedValue(undefined);
    mockCreatorApi.updateSplits.mockResolvedValue({ creator: updatedCreator });

    render(<SplitsPage />);

    // Wait for the page to load with initial splits
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeInTheDocument();
    });

    // Change the first split to 5000 bps
    const bpsInputs = screen.getAllByLabelText(/basis points/i);
    await userEvent.clear(bpsInputs[0]!);
    await userEvent.type(bpsInputs[0]!, "5000");

    // Add a collaborator
    const addButton = screen.getByRole("button", { name: /add collaborator/i });
    await userEvent.click(addButton);

    // Fill in the new collaborator's address
    const addressInputs = screen.getAllByLabelText(/address/i);
    await userEvent.type(addressInputs[1]!, "GCB6PYGTNPFCHUXULHSVCTITYXPUB4Y6JKW2GSJ5C2WL5CRQBY5GUBNR");

    // Fill in the new collaborator's bps
    const newBpsInputs = screen.getAllByLabelText(/basis points/i);
    await userEvent.type(newBpsInputs[1]!, "5000");

    // Click save
    const saveButton = screen.getByRole("button", { name: /save collaborator splits/i });
    await userEvent.click(saveButton);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/splits saved successfully/i)).toBeInTheDocument();
    });

    expect(mockSyncJarToChain).toHaveBeenCalledWith({
      owner: mockWallet.publicKey,
      jarId: MOCK_CREATOR.jarId,
      splits: updatedSplits,
    });

    expect(mockCreatorApi.updateSplits).toHaveBeenCalledWith(
      mockWallet.jwt,
      updatedSplits,
    );
  });
});

describe("SplitsPage – backend error handling", () => {
  it("shows an error when the backend update fails after successful on-chain sync", async () => {
    mockSyncJarToChain.mockResolvedValue(undefined);
    mockCreatorApi.updateSplits.mockRejectedValue(new Error("Network timeout"));

    render(<SplitsPage />);

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save collaborator splits/i })).toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByRole("button", { name: /save collaborator splits/i });
    await userEvent.click(saveButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
    });

    expect(mockSyncJarToChain).toHaveBeenCalledTimes(1);
    expect(mockCreatorApi.updateSplits).toHaveBeenCalledTimes(1);
  });
});

describe("SplitsPage – initial load", () => {
  it("displays the creator's current splits after loading", async () => {
    render(<SplitsPage />);

    await waitFor(() => {
      expect(mockAuthApi.me).toHaveBeenCalledWith(mockWallet.jwt, expect.anything());
    });

    await waitFor(() => {
      expect(mockCreatorApi.getBySlug).toHaveBeenCalledWith("testcreator", expect.anything());
    });

    // The address input should contain the creator's address
    await waitFor(() => {
      const addressInput = screen.getByDisplayValue(mockWallet.publicKey);
      expect(addressInput).toBeInTheDocument();
    });
  });
});
