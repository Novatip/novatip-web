/**
 * src/components/NotificationPreferences.test.tsx
 *
 * Unit tests for the per-channel preference toggles.
 *
 * The optimistic update is only trustworthy if a rejected save puts the old
 * value back, so these tests hold the API request open and assert both halves:
 * the state immediately after the click, and the state once the request
 * settles.
 *
 * Covers:
 *   - A successful save keeps the optimistic value and clears the lock
 *   - A failed save reverts the toggle and surfaces the error banner
 *   - Both toggles are disabled while a save is in flight
 *   - A second change is ignored while one is already saving
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationPreferences } from "./NotificationPreferences";
import { ApiError, type NotificationPreferences as Prefs } from "@/lib/api";

const getPreferences = vi.hoisted(() => vi.fn());
const updatePreferences = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  notificationsApi: { getPreferences, updatePreferences },
}));

const JWT = "test-jwt";

const BOTH_ENABLED: Prefs = { emailEnabled: true, webhookEnabled: true };

/** A promise whose settlement the test controls, so "saving" can be observed. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function toggle(id: string): HTMLInputElement {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement)) throw new Error(`Missing toggle #${id}`);
  return el;
}

async function renderLoaded() {
  render(<NotificationPreferences jwt={JWT} />);
  await screen.findByText("Email");
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NotificationPreferences – saving", () => {
  it("keeps the optimistic value after a successful save", async () => {
    const save = deferred<{ preferences: Prefs }>();
    getPreferences.mockResolvedValue({ preferences: BOTH_ENABLED });
    updatePreferences.mockReturnValue(save.promise);
    const user = userEvent.setup();

    await renderLoaded();
    const email = toggle("notif-email");
    expect(email.checked).toBe(true);

    await user.click(email);

    // Optimistic: unchecked before the server answers.
    expect(email.checked).toBe(false);
    expect(updatePreferences).toHaveBeenCalledTimes(1);
    expect(updatePreferences).toHaveBeenCalledWith(JWT, { emailEnabled: false });

    await act(async () => {
      save.resolve({
        preferences: { emailEnabled: false, webhookEnabled: true },
      });
    });

    expect(email.checked).toBe(false);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(toggle("notif-webhook")).not.toBeDisabled();
  });

  it("reverts the toggle and shows the error when the save fails", async () => {
    const save = deferred<{ preferences: Prefs }>();
    getPreferences.mockResolvedValue({ preferences: BOTH_ENABLED });
    updatePreferences.mockReturnValue(save.promise);
    const user = userEvent.setup();

    await renderLoaded();
    const email = toggle("notif-email");

    await user.click(email);
    expect(email.checked).toBe(false);

    await act(async () => {
      save.reject(new ApiError(500, "INTERNAL", "Could not save preferences."));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save preferences.",
    );
    expect(email.checked).toBe(true);
    expect(toggle("notif-webhook")).not.toBeDisabled();
  });

  it("disables both toggles while saving and ignores a second change", async () => {
    const save = deferred<{ preferences: Prefs }>();
    getPreferences.mockResolvedValue({ preferences: BOTH_ENABLED });
    updatePreferences.mockReturnValue(save.promise);
    const user = userEvent.setup();

    await renderLoaded();
    const email = toggle("notif-email");
    const webhook = toggle("notif-webhook");

    await user.click(email);

    expect(email).toBeDisabled();
    expect(webhook).toBeDisabled();

    // Even an event that slips through while saving must not start a second save.
    fireEvent.click(webhook);
    expect(updatePreferences).toHaveBeenCalledTimes(1);

    await act(async () => {
      save.resolve({
        preferences: { emailEnabled: false, webhookEnabled: true },
      });
    });

    expect(email).not.toBeDisabled();
    expect(webhook).not.toBeDisabled();
    expect(updatePreferences).toHaveBeenCalledTimes(1);
  });
});
