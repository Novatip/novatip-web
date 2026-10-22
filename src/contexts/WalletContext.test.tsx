/**
 * src/contexts/WalletContext.test.tsx
 *
 * Behavioural tests for the two ways a session enters or leaves the app
 * without the user clicking anything new:
 *
 *   - rehydration on mount, where the wallet key and the creator JWT are
 *     restored independently from storage
 *   - teardown on a 401 broadcast, which must clear the key, the JWT and
 *     storage together and explain why
 *
 * Both paths are load-bearing: a bug in rehydration silently logs a returning
 * visitor out, and a bug in teardown leaves the dashboard rendering against a
 * dead token. They are pinned here through `useWallet`, the same interface
 * every screen consumes, rather than by reaching into the provider's state.
 *
 * The storage keys are asserted by name on purpose. They are the contract
 * between this provider and a previous visit to the site — an existing
 * session lives under these exact keys — so renaming one is a breaking change
 * that should fail a test, not slip through because the test imported the
 * same private constant.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletProvider, useWallet } from "./WalletContext";
import { emitUnauthorized } from "@/lib/authEvents";

// The provider imports the Freighter helpers even though neither rehydration
// nor teardown calls them. Replacing the module keeps this file focused on
// state transitions instead of a wallet extension that is not installed in
// the test environment.
vi.mock("@/lib/wallet", () => ({
  connectFreighter:     vi.fn(),
  isFreighterInstalled: vi.fn(),
  signNonce:            vi.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PK_KEY  = "novatip_pk";
const JWT_KEY = "novatip_jwt";

const PUBLIC_KEY = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";

const EXPIRY_MESSAGE = "Your session has expired. Please reconnect your wallet.";

/** Encode a JWT payload the way `lib/jwt.ts` decodes it: base64url, unpadded. */
function base64Url(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeJwt(expOffsetSeconds: number): string {
  const header  = base64Url({ alg: "none", typ: "JWT" });
  const payload = base64Url({
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
  });
  return `${header}.${payload}.signature`;
}

const VALID_JWT   = makeJwt(3600);
const EXPIRED_JWT = makeJwt(-3600);

/**
 * Renders the public surface of the context. Reading through the hook means
 * these tests fail if the provider stops exposing a field, which is exactly
 * as important as the field's value.
 */
function WalletProbe() {
  const { publicKey, jwt, isConnected, error, disconnect } = useWallet();

  return (
    <>
      <output data-testid="public-key">{publicKey ?? "none"}</output>
      <output data-testid="jwt">{jwt ?? "none"}</output>
      <output data-testid="is-connected">{String(isConnected)}</output>
      <output data-testid="error">{error ?? "none"}</output>
      <button type="button" onClick={disconnect}>
        Disconnect wallet
      </button>
    </>
  );
}

function renderWallet() {
  return render(
    <WalletProvider>
      <WalletProbe />
    </WalletProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

// ── Rehydration (#239) ────────────────────────────────────────────────────────

describe("WalletProvider – rehydration", () => {
  it("restores a stored public key without requiring a creator session", () => {
    // The normal state for someone who only came to tip: the wallet is
    // connected, but there is no dashboard session and never was. Requiring
    // a JWT here would log them straight back out.
    localStorage.setItem(PK_KEY, PUBLIC_KEY);

    renderWallet();

    expect(screen.getByTestId("public-key")).toHaveTextContent(PUBLIC_KEY);
    expect(screen.getByTestId("is-connected")).toHaveTextContent("true");
    expect(screen.getByTestId("jwt")).toHaveTextContent("none");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
    expect(localStorage.getItem(JWT_KEY)).toBeNull();
  });

  it("restores a stored JWT that has not expired", () => {
    localStorage.setItem(PK_KEY, PUBLIC_KEY);
    localStorage.setItem(JWT_KEY, VALID_JWT);

    renderWallet();

    expect(screen.getByTestId("jwt")).toHaveTextContent(VALID_JWT);
    expect(screen.getByTestId("is-connected")).toHaveTextContent("true");
    // The token is still valid, so it must survive rehydration in storage too.
    expect(localStorage.getItem(JWT_KEY)).toBe(VALID_JWT);
  });

  it("removes an expired JWT instead of restoring it", () => {
    localStorage.setItem(PK_KEY, PUBLIC_KEY);
    localStorage.setItem(JWT_KEY, EXPIRED_JWT);

    renderWallet();

    expect(screen.getByTestId("jwt")).toHaveTextContent("none");
    // Expiry only discards the dead token — it must not take the wallet
    // connection down with it.
    expect(screen.getByTestId("public-key")).toHaveTextContent(PUBLIC_KEY);
    expect(screen.getByTestId("is-connected")).toHaveTextContent("true");
    // Skipping the round trip is only useful if the dead token is also gone;
    // leaving it behind would make every later visit repeat the same check.
    expect(localStorage.getItem(JWT_KEY)).toBeNull();
  });
});

// ── Session teardown on 401 (#240) ────────────────────────────────────────────

describe("WalletProvider – session teardown on 401", () => {
  it("clears the key, the JWT and storage when a 401 is broadcast", () => {
    localStorage.setItem(PK_KEY, PUBLIC_KEY);
    localStorage.setItem(JWT_KEY, VALID_JWT);

    renderWallet();

    // Confirm the session was actually live before tearing it down, so this
    // test cannot pass against a provider that never restored anything.
    expect(screen.getByTestId("is-connected")).toHaveTextContent("true");
    expect(screen.getByTestId("jwt")).toHaveTextContent(VALID_JWT);

    act(() => {
      emitUnauthorized();
    });

    expect(screen.getByTestId("public-key")).toHaveTextContent("none");
    expect(screen.getByTestId("jwt")).toHaveTextContent("none");
    expect(screen.getByTestId("is-connected")).toHaveTextContent("false");
    expect(localStorage.getItem(PK_KEY)).toBeNull();
    expect(localStorage.getItem(JWT_KEY)).toBeNull();
  });

  it("sets the session-expired message when a 401 is broadcast", () => {
    localStorage.setItem(PK_KEY, PUBLIC_KEY);
    localStorage.setItem(JWT_KEY, VALID_JWT);

    renderWallet();

    act(() => {
      emitUnauthorized();
    });

    expect(screen.getByTestId("error")).toHaveTextContent(EXPIRY_MESSAGE);
  });

  it("clears the same state when the user disconnects deliberately", async () => {
    localStorage.setItem(PK_KEY, PUBLIC_KEY);
    localStorage.setItem(JWT_KEY, VALID_JWT);

    const user = userEvent.setup();
    renderWallet();

    expect(screen.getByTestId("is-connected")).toHaveTextContent("true");

    await user.click(screen.getByRole("button", { name: "Disconnect wallet" }));

    expect(screen.getByTestId("public-key")).toHaveTextContent("none");
    expect(screen.getByTestId("jwt")).toHaveTextContent("none");
    expect(screen.getByTestId("is-connected")).toHaveTextContent("false");
    expect(localStorage.getItem(PK_KEY)).toBeNull();
    expect(localStorage.getItem(JWT_KEY)).toBeNull();

    // A deliberate disconnect is not an expiry. Leaving the 401 message
    // behind would tell someone who just disconnected that their session
    // expired, which is both wrong and confusing.
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });
});
