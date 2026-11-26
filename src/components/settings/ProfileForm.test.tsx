/**
 * src/components/settings/ProfileForm.test.tsx
 *
 * Unit tests for ProfileForm beforeunload handler.
 *
 * Covers:
 *   - beforeunload handler is added when form becomes dirty
 *   - beforeunload handler is removed when form is clean
 *   - beforeunload handler is removed after successful save
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "./ProfileForm";
import type { CreatorProfile } from "@/lib/api";

const mockCreatorApi = vi.hoisted(() => ({
  updateProfile: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  creatorApi: mockCreatorApi,
}));

vi.mock("@/components/Avatar", () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

const MOCK_CREATOR: CreatorProfile = {
  id: "creator-123",
  slug: "testcreator",
  jarId: "@testcreator",
  displayName: "Test Creator",
  bio: "This is a bio",
  avatarUrl: null,
  email: null,
  splits: [],
  createdAt: "2024-01-01T00:00:00Z",
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProfileForm – clearing fields", () => {
  it("sends null when clearing display name", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const clearedCreator = { ...MOCK_CREATOR, displayName: null };
    mockCreatorApi.updateProfile.mockResolvedValue({ creator: clearedCreator });

    render(<ProfileForm jwt="mock-jwt" creator={MOCK_CREATOR} onUpdate={onUpdate} />);

    // Clear the display name
    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.clear(displayNameInput);

    // Save the form
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    // Should send null for cleared display name
    await waitFor(() => {
      expect(mockCreatorApi.updateProfile).toHaveBeenCalledWith(
        "mock-jwt",
        expect.objectContaining({
          displayName: null,
        })
      );
    });

    // Form should show empty after save
    await waitFor(() => {
      expect(screen.getByText(/profile saved/i)).toBeInTheDocument();
    });
    expect((displayNameInput as HTMLInputElement).value).toBe("");
  });

  it("sends null when clearing bio", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const clearedCreator = { ...MOCK_CREATOR, bio: null };
    mockCreatorApi.updateProfile.mockResolvedValue({ creator: clearedCreator });

    render(<ProfileForm jwt="mock-jwt" creator={MOCK_CREATOR} onUpdate={onUpdate} />);

    // Clear the bio
    const bioInput = screen.getByLabelText(/bio/i);
    await user.clear(bioInput);

    // Save the form
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    // Should send null for cleared bio
    await waitFor(() => {
      expect(mockCreatorApi.updateProfile).toHaveBeenCalledWith(
        "mock-jwt",
        expect.objectContaining({
          bio: null,
        })
      );
    });

    // Form should show empty after save
    await waitFor(() => {
      expect(screen.getByText(/profile saved/i)).toBeInTheDocument();
    });
    expect((bioInput as HTMLTextAreaElement).value).toBe("");
  });

  it("sends null when clearing avatar URL", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const creatorWithAvatar = { ...MOCK_CREATOR, avatarUrl: "https://example.com/avatar.jpg" };
    const clearedCreator = { ...creatorWithAvatar, avatarUrl: null };
    mockCreatorApi.updateProfile.mockResolvedValue({ creator: clearedCreator });

    render(<ProfileForm jwt="mock-jwt" creator={creatorWithAvatar} onUpdate={onUpdate} />);

    // Clear the avatar URL
    const avatarInput = screen.getByLabelText(/avatar url/i);
    await user.clear(avatarInput);

    // Save the form
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    // Should send null for cleared avatar URL
    await waitFor(() => {
      expect(mockCreatorApi.updateProfile).toHaveBeenCalledWith(
        "mock-jwt",
        expect.objectContaining({
          avatarUrl: null,
        })
      );
    });

    // Form should show empty after save
    await waitFor(() => {
      expect(screen.getByText(/profile saved/i)).toBeInTheDocument();
    });
    expect((avatarInput as HTMLInputElement).value).toBe("");
  });

  it("preserves the hint about blank avatar URL", async () => {
    render(<ProfileForm jwt="mock-jwt" creator={MOCK_CREATOR} onUpdate={vi.fn()} />);

    // The hint should mention keeping current avatar when blank
    expect(
      screen.getByText(/leave blank to keep your current avatar/i)
    ).toBeInTheDocument();
  });
});

describe("ProfileForm – beforeunload handler", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("adds beforeunload handler when form becomes dirty", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(<ProfileForm jwt="mock-jwt" creator={MOCK_CREATOR} onUpdate={onUpdate} />);

    // Initially clean, no handler
    expect(addEventListenerSpy).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));

    // Type into display name to make form dirty
    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.type(displayNameInput, " Updated");

    // Handler should now be added
    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    });
  });

  it("removes beforeunload handler when form becomes clean again", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(<ProfileForm jwt="mock-jwt" creator={MOCK_CREATOR} onUpdate={onUpdate} />);

    // Type into display name to make form dirty
    const displayNameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;
    await user.type(displayNameInput, " Updated");

    // Handler should be added
    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    });

    // Clear the field back to original value
    await user.clear(displayNameInput);
    await user.type(displayNameInput, MOCK_CREATOR.displayName!);

    // Handler should be removed
    await waitFor(() => {
      expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    });
  });

  it("removes beforeunload handler after successful save", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const updatedCreator = { ...MOCK_CREATOR, displayName: "Test Creator Updated" };
    mockCreatorApi.updateProfile.mockResolvedValue({ creator: updatedCreator });

    render(<ProfileForm jwt="mock-jwt" creator={MOCK_CREATOR} onUpdate={onUpdate} />);

    // Type into display name to make form dirty
    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.type(displayNameInput, " Updated");

    // Handler should be added
    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    });

    // Save the form
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    // Wait for save to complete
    await waitFor(() => {
      expect(screen.getByText(/profile saved/i)).toBeInTheDocument();
    });

    // Handler should be removed after save
    await waitFor(() => {
      expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    });
  });

  it("prevents default on beforeunload when form is dirty", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(<ProfileForm jwt="mock-jwt" creator={MOCK_CREATOR} onUpdate={onUpdate} />);

    // Type into display name to make form dirty
    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.type(displayNameInput, " Updated");

    // Get the handler that was registered
    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    });

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "beforeunload"
    )?.[1] as (e: BeforeUnloadEvent) => void;

    expect(handler).toBeDefined();

    // Create a mock beforeunload event
    const mockEvent = new Event("beforeunload") as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(mockEvent, "preventDefault");

    // Call the handler
    handler(mockEvent);

    // Should call preventDefault
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
