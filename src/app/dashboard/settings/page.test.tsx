/**
 * src/app/dashboard/settings/page.test.tsx
 *
 * Unit tests for the settings page slug rename flow.
 *
 * Covers:
 *   - The button stays disabled until all three conditions hold
 *   - The creator's current slug is reported as unchanged
 *   - Success clears the inputs and shows the confirmation
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import SettingsPage from "./page";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}));

vi.mock("@/components/NotificationPreferences", () => ({
  NotificationPreferences: () => <div data-testid="notification-preferences" />,
}));

const mockWallet = vi.hoisted(() => ({
  publicKey:    "GOWNER123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC",
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
  checkSlug: vi.fn(),
  updateSlug: vi.fn(),
  updateProfile: vi.fn(),
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

const MOCK_CREATOR = {
  slug: "currentslug",
  jarId: "@currentslug",
  displayName: "Test Creator",
  bio: "This is a bio",
  avatarUrl: null,
  splits: [],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockWallet.publicKey = "GOWNER123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC";
  mockWallet.jwt = "mock.jwt.token";
  mockAuthApi.me.mockResolvedValue({ user: { slug: "currentslug" } });
  mockCreatorApi.getBySlug.mockResolvedValue({ creator: MOCK_CREATOR });
});

describe("SettingsPage – notification preferences", () => {
  it("renders the card once the creator has loaded", async () => {
    render(<SettingsPage />);
    expect(await screen.findByTestId("notification-preferences")).toBeInTheDocument();
  });

  it("does not render the card when signed out", () => {
    mockWallet.jwt = null as unknown as string;
    render(<SettingsPage />);
    expect(screen.queryByTestId("notification-preferences")).not.toBeInTheDocument();
  });
});

describe("SettingsPage – rename button disabled until conditions met", () => {
  it("keeps the button disabled when slug is invalid", async () => {
    render(<SettingsPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByLabelText(/new slug/i)).toBeEnabled();
    });

    const slugInput = screen.getByLabelText(/new slug/i);
    const checkbox = screen.getByRole("checkbox");
    
    // A two-character slug stays invalid after input normalization.
    await userEvent.type(slugInput, "ab");

    // Check the acknowledgement
    await userEvent.click(checkbox);

    // Button should still be disabled because slug is invalid
    const renameButton = screen.getByRole("button", { name: /rename to @ab$/i });
    expect(renameButton).toBeDisabled();
    expect(mockCreatorApi.checkSlug).not.toHaveBeenCalled();
  });

  it("keeps the button disabled when slug is not available", async () => {
    mockCreatorApi.checkSlug.mockResolvedValue({ available: false });

    render(<SettingsPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByLabelText(/new slug/i)).toBeEnabled();
    });

    const slugInput = screen.getByLabelText(/new slug/i);
    const checkbox = screen.getByRole("checkbox");
    
    // Type a valid slug that's taken
    await userEvent.type(slugInput, "takenslug");

    // Wait for availability check
    await waitFor(() => {
      expect(screen.getByText(/taken/i)).toBeInTheDocument();
    });

    // Check the acknowledgement
    await userEvent.click(checkbox);

    // Button should still be disabled because slug is taken
    const renameButton = screen.getByRole("button", { name: /rename to @takenslug/i });
    expect(renameButton).toBeDisabled();
  });

  it("keeps the button disabled when acknowledgement is not checked", async () => {
    mockCreatorApi.checkSlug.mockResolvedValue({ available: true });

    render(<SettingsPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByLabelText(/new slug/i)).toBeEnabled();
    });

    const slugInput = screen.getByLabelText(/new slug/i);
    
    // Type a valid, available slug
    await userEvent.type(slugInput, "availableslug");

    // Wait for availability check
    await waitFor(() => {
      expect(screen.getByText(/available/i)).toBeInTheDocument();
    });

    // Don't check the acknowledgement
    const renameButton = screen.getByRole("button", { name: /rename to @availableslug/i });
    expect(renameButton).toBeDisabled();
  });

  it("enables the button when all three conditions are met", async () => {
    mockCreatorApi.checkSlug.mockResolvedValue({ available: true });

    render(<SettingsPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByLabelText(/new slug/i)).toBeEnabled();
    });

    const slugInput = screen.getByLabelText(/new slug/i);
    const checkbox = screen.getByRole("checkbox");
    
    // Type a valid, available slug
    await userEvent.type(slugInput, "newvalidslug");

    // Wait for availability check
    await waitFor(() => {
      expect(screen.getByText(/available/i)).toBeInTheDocument();
    });

    // Check the acknowledgement
    await userEvent.click(checkbox);

    // Button should now be enabled
    const renameButton = screen.getByRole("button", { name: /rename to @newvalidslug/i });
    expect(renameButton).not.toBeDisabled();
  });
});

describe("SettingsPage – current slug reported as unchanged", () => {
  it("reports the current slug as unchanged and disables the button", async () => {
    render(<SettingsPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByLabelText(/new slug/i)).toBeEnabled();
    });

    const slugInput = screen.getByLabelText(/new slug/i);
    const checkbox = screen.getByRole("checkbox");
    
    // Type the current slug
    await userEvent.type(slugInput, "currentslug");

    // Should show "That's your current slug" badge
    await waitFor(() => {
      expect(screen.getByText(/that's your current slug/i)).toBeInTheDocument();
    });

    // Check the acknowledgement
    await userEvent.click(checkbox);

    // Button should be disabled because it's the same slug
    const renameButton = screen.getByRole("button", { name: /rename to @currentslug/i });
    expect(renameButton).toBeDisabled();

    // Should not trigger availability check for current slug
    expect(mockCreatorApi.checkSlug).not.toHaveBeenCalled();
  });
});

describe("SettingsPage – successful rename clears inputs and shows confirmation", () => {
  it("clears the slug input, unchecks acknowledgement, and shows success message", async () => {
    const updatedCreator = {
      ...MOCK_CREATOR,
      slug: "newslug",
      jarId: "@newslug",
    };

    mockCreatorApi.checkSlug.mockResolvedValue({ available: true });
    mockCreatorApi.updateSlug.mockResolvedValue({ creator: updatedCreator });

    render(<SettingsPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByLabelText(/new slug/i)).toBeEnabled();
    });

    const slugInput = screen.getByLabelText(/new slug/i) as HTMLInputElement;
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    
    // Type a valid, available slug
    await userEvent.type(slugInput, "newslug");

    // Wait for availability check
    await waitFor(() => {
      expect(screen.getByText(/available/i)).toBeInTheDocument();
    });

    // Check the acknowledgement
    await userEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    // Click rename button
    const renameButton = screen.getByRole("button", { name: /rename to @newslug/i });
    await userEvent.click(renameButton);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/slug renamed successfully/i)).toBeInTheDocument();
    });

    // Verify the API was called
    expect(mockCreatorApi.updateSlug).toHaveBeenCalledWith("mock.jwt.token", "newslug");

    // Input should be cleared
    expect(slugInput.value).toBe("");

    // Checkbox should be unchecked
    expect(checkbox.checked).toBe(false);
  });
});

describe("SettingsPage – rename error handling", () => {
  it("shows an error message when rename fails", async () => {
    mockCreatorApi.checkSlug.mockResolvedValue({ available: true });
    mockCreatorApi.updateSlug.mockRejectedValue(new Error("Slug already taken"));

    render(<SettingsPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByLabelText(/new slug/i)).toBeEnabled();
    });

    const slugInput = screen.getByLabelText(/new slug/i);
    const checkbox = screen.getByRole("checkbox");
    
    // Type a valid, available slug
    await userEvent.type(slugInput, "errorslug");

    // Wait for availability check
    await waitFor(() => {
      expect(screen.getByText(/available/i)).toBeInTheDocument();
    });

    // Check the acknowledgement
    await userEvent.click(checkbox);

    // Click rename button
    const renameButton = screen.getByRole("button", { name: /rename to @errorslug/i });
    await userEvent.click(renameButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/slug already taken/i)).toBeInTheDocument();
    });

    expect(mockCreatorApi.updateSlug).toHaveBeenCalledWith("mock.jwt.token", "errorslug");
  });
});

describe("SettingsPage – slug validation", () => {
  it("strips invalid characters as the user types", async () => {
    render(<SettingsPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByLabelText(/new slug/i)).toBeEnabled();
    });

    const slugInput = screen.getByLabelText(/new slug/i) as HTMLInputElement;
    
    // Type slug with invalid characters (uppercase, spaces, special chars)
    await userEvent.type(slugInput, "Test Slug!@#$123");

    // Should only keep valid characters (lowercase, numbers, hyphens, underscores)
    expect(slugInput.value).toBe("testslug123");
  });

  it("enforces the 32 character maximum", async () => {
    render(<SettingsPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByLabelText(/new slug/i)).toBeEnabled();
    });

    const slugInput = screen.getByLabelText(/new slug/i) as HTMLInputElement;
    
    // Type a slug longer than 32 characters
    const longSlug = "a".repeat(40);
    await userEvent.type(slugInput, longSlug);

    // Should be truncated to 32 characters
    expect(slugInput.value.length).toBeLessThanOrEqual(32);
  });
});
