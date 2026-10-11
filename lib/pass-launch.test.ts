import { describe, expect, it } from "vitest";
import { markPassLaunchSeen, NEW_USER_MS, shouldShowPassLaunch } from "./pass-launch";

function store() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

const NOW = Date.parse("2026-10-11T10:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

/** A device: localStorage lasts, sessionStorage is new on every launch of the app. */
function device() {
  const local = store();
  let session = store();
  return {
    stores: () => ({ local, session }),
    relaunch: () => {
      session = store();
    },
  };
}

describe("shouldShowPassLaunch", () => {
  it("shows at once to someone who was already using Aroha", () => {
    const d = device();
    const user = { id: "u1", profileCompletedAt: ago(30 * NEW_USER_MS) };
    expect(shouldShowPassLaunch(user, NOW, d.stores())).toBe(true);
  });

  it("does not show to a new user on their first visit, and shows on the second", () => {
    const d = device();
    const user = { id: "u1", profileCompletedAt: ago(60_000) };
    expect(shouldShowPassLaunch(user, NOW, d.stores())).toBe(false);
    // Still the same visit: moving between pages, or coming back to Home.
    expect(shouldShowPassLaunch(user, NOW + 5 * 60_000, d.stores())).toBe(false);

    d.relaunch();
    expect(shouldShowPassLaunch(user, NOW + 60 * 60_000, d.stores())).toBe(true);
  });

  it("a new user's long first visit never turns into a second one", () => {
    const d = device();
    const user = { id: "u1", profileCompletedAt: ago(60_000) };
    expect(shouldShowPassLaunch(user, NOW, d.stores())).toBe(false);
    expect(shouldShowPassLaunch(user, NOW + 3 * NEW_USER_MS, d.stores())).toBe(false);
  });

  it("stays away for good once the user has closed it", () => {
    const d = device();
    const user = { id: "u1", profileCompletedAt: ago(30 * NEW_USER_MS) };
    expect(shouldShowPassLaunch(user, NOW, d.stores())).toBe(true);
    markPassLaunchSeen(user.id, d.stores());
    expect(shouldShowPassLaunch(user, NOW, d.stores())).toBe(false);
    d.relaunch();
    expect(shouldShowPassLaunch(user, NOW, d.stores())).toBe(false);
  });

  it("is kept apart for each account on a shared device", () => {
    const d = device();
    markPassLaunchSeen("u1", d.stores());
    expect(shouldShowPassLaunch({ id: "u2", profileCompletedAt: ago(30 * NEW_USER_MS) }, NOW, d.stores())).toBe(true);
  });

  it("never shows before the profile is finished, or when storage is blocked", () => {
    const d = device();
    expect(shouldShowPassLaunch({ id: "u1", profileCompletedAt: null }, NOW, d.stores())).toBe(false);
    expect(shouldShowPassLaunch({ id: "u1", profileCompletedAt: ago(30 * NEW_USER_MS) }, NOW, null)).toBe(false);
  });
});
