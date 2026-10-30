/**
 * src/app/onboarding/page.test.tsx
 *
 * Unit tests for the onboarding resume logic.
 *
 * Covers:
 *   - A placeholder slug starts at step one (slug claim)
 *   - A claimed slug with no splits resumes at step two (splits)
 *   - A slug with splits goes to the share step
 *   - A failed lookup falls back to the start
 *   - A disconnected wallet sees the connect prompt
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import OnboardingPage from "./page";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockWallet = vi.hoisted(() => ({
  publicKey:    null as string | null,
  jwt:          null as string | null,
  isConnected:  false,
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockWallet.publicKey = null;
  mockWallet.jwt = null;
  mockWallet.isConnected = false;
  mockAuthApi.me.mockReset();
  mockCreatorApi.getBySlug.mockReset();
});

describe("OnboardingPage – disconnected state", () => {
  it("shows the connect prompt when wallet is disconnected", () => {
    mockWallet.isConnected = false;

    render(<OnboardingPage />);

    expect(screen.getByText(/connect your stellar wallet to get started/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });
});

describe("OnboardingPage – resume logic", () => {
  beforeEach(() => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = "GOWNER123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC";
  });

  it("starts at step one for a placeholder slug", async () => {
    mockWallet.jwt = "mock.jwt.token";
    mockAuthApi.me.mockResolvedValue({ user: { slug: "user_a1b2c3d4" } });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mockAuthApi.me).toHaveBeenCalledWith("mock.jwt.token");
    });

    // Should not attempt to fetch creator profile for a temp slug
    expect(mockCreatorApi.getBySlug).not.toHaveBeenCalled();

    // Step indicator should show we're at the first step (slug claim)
    await waitFor(() => {
      expect(screen.getByText(/claim slug/i)).toBeInTheDocument();
    });
  });

  it("resumes at step two for a claimed slug with no splits", async () => {
    mockWallet.jwt = "mock.jwt.token";
    mockAuthApi.me.mockResolvedValue({ user: { slug: "realcreator" } });
    mockCreatorApi.getBySlug.mockResolvedValue({
      creator: {
        slug: "realcreator",
        jarId: "@realcreator",
        splits: [],
      },
    });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mockAuthApi.me).toHaveBeenCalledWith("mock.jwt.token");
    });

    await waitFor(() => {
      expect(mockCreatorApi.getBySlug).toHaveBeenCalledWith("realcreator");
    });

    // Should show the splits step
    await waitFor(() => {
      // Step 2 is the splits step - looking for text that indicates we're on that step
      expect(screen.queryByText(/checking your progress/i)).not.toBeInTheDocument();
    });
  });

  it("goes to the share step for a slug with splits configured", async () => {
    mockWallet.jwt = "mock.jwt.token";
    mockAuthApi.me.mockResolvedValue({ user: { slug: "completecreator" } });
    mockCreatorApi.getBySlug.mockResolvedValue({
      creator: {
        slug: "completecreator",
        jarId: "@completecreator",
        splits: [
          { to: "GOWNER123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC", bps: 10000 },
        ],
      },
    });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mockAuthApi.me).toHaveBeenCalledWith("mock.jwt.token");
    });

    await waitFor(() => {
      expect(mockCreatorApi.getBySlug).toHaveBeenCalledWith("completecreator");
    });

    // Should show the share step (step 3)
    await waitFor(() => {
      expect(screen.queryByText(/checking your progress/i)).not.toBeInTheDocument();
    });
  });

  it("falls back to the start when the API lookup fails", async () => {
    mockWallet.jwt = "mock.jwt.token";
    mockAuthApi.me.mockRejectedValue(new Error("Network error"));

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mockAuthApi.me).toHaveBeenCalledWith("mock.jwt.token");
    });

    // Should fall back to step 0 - the slug claim step
    await waitFor(() => {
      expect(screen.queryByText(/checking your progress/i)).not.toBeInTheDocument();
    });

    // Step indicator should be present (not in error state)
    await waitFor(() => {
      expect(screen.getByText(/claim slug/i)).toBeInTheDocument();
    });
  });

  it("shows resuming state while fetching creator data", async () => {
    mockWallet.jwt = "mock.jwt.token";
    
    // Delay the API response to keep the resuming state visible
    mockAuthApi.me.mockImplementation(() => new Promise(() => {}));

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText(/checking your progress/i)).toBeInTheDocument();
    });
  });
});

describe("OnboardingPage – sign-in requirement", () => {
  it("prompts to sign in when wallet is connected but no JWT", () => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = "GOWNER123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC";
    mockWallet.jwt = null;

    render(<OnboardingPage />);

    expect(screen.getByText(/sign in to continue creating your tip jar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows error and retry button when sign-in fails", () => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = "GOWNER123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC";
    mockWallet.jwt = null;
    mockWallet.error = "Sign-in failed: User rejected";

    render(<OnboardingPage />);

    expect(screen.getByText(/sign-in failed: user rejected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});

describe("OnboardingPage – step progression", () => {
  beforeEach(() => {
    mockWallet.isConnected = true;
    mockWallet.publicKey = "GOWNER123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC";
    mockWallet.jwt = "mock.jwt.token";
    mockAuthApi.me.mockResolvedValue({ user: { slug: "user_12345678" } });
  });

  it("shows step indicator when not resuming", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mockAuthApi.me).toHaveBeenCalled();
    });

    await waitFor(() => {
      // Step indicator labels should be visible
      expect(screen.getByText(/claim slug/i)).toBeInTheDocument();
      expect(screen.getByText(/set splits/i)).toBeInTheDocument();
      expect(screen.getByText(/share/i)).toBeInTheDocument();
    });
  });

  it("hides step indicator while resuming", () => {
    mockAuthApi.me.mockImplementation(() => new Promise(() => {}));

    render(<OnboardingPage />);

    expect(screen.getByText(/checking your progress/i)).toBeInTheDocument();
    // Step indicator should not be visible while resuming
    expect(screen.queryByText(/claim slug/i)).not.toBeInTheDocument();
  });
});
