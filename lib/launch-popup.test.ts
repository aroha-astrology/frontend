import { describe, expect, it } from "vitest";
import { markLaunchSeen, shouldShowVarshikLaunch, VARSHIK_LAUNCH_ID } from "./launch-popup";

function store(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}
const NOW = Date.UTC(2026, 11, 20);
const old = "2026-01-01T00:00:00.000Z";
const user = (over = {}) => ({ id: "u1", profileCompletedAt: old as string | null, popupsSeen: [] as string[], ...over });
const on = { popupOn: true, reportOn: true };
const fresh = () => ({ local: store(), session: store() });

describe("Varshik launch pop-up", () => {
  it("shows once to an existing user when both switches are on", () => {
    expect(shouldShowVarshikLaunch({ ...on, user: user(), now: NOW, stores: fresh() })).toBe(true);
  });
  it("never shows with either switch off", () => {
    expect(shouldShowVarshikLaunch({ popupOn: false, reportOn: true, user: user(), now: NOW, stores: fresh() })).toBe(false);
    expect(shouldShowVarshikLaunch({ popupOn: true, reportOn: false, user: user(), now: NOW, stores: fresh() })).toBe(false);
  });
  it("never shows if the server says this user has seen it (reinstall, new phone)", () => {
    const u = user({ popupsSeen: [VARSHIK_LAUNCH_ID] });
    expect(shouldShowVarshikLaunch({ ...on, user: u, now: NOW, stores: fresh() })).toBe(false);
  });
  it("never shows again once closed on this device", () => {
    const stores = fresh();
    markLaunchSeen(VARSHIK_LAUNCH_ID, "u1", stores);
    expect(shouldShowVarshikLaunch({ ...on, user: user(), now: NOW, stores })).toBe(false);
  });
  it("skips a brand-new user's first visit, then shows on the next", () => {
    const stores = fresh();
    const u = user({ profileCompletedAt: new Date(NOW - 60_000).toISOString() });
    expect(shouldShowVarshikLaunch({ ...on, user: u, now: NOW, stores })).toBe(false);
    stores.session.setItem("aroha:visitId", "another-visit");
    expect(shouldShowVarshikLaunch({ ...on, user: u, now: NOW, stores })).toBe(true);
  });
  it("never shows without storage or before the profile is done", () => {
    expect(shouldShowVarshikLaunch({ ...on, user: user(), now: NOW, stores: null })).toBe(false);
    expect(shouldShowVarshikLaunch({ ...on, user: user({ profileCompletedAt: null }), now: NOW, stores: fresh() })).toBe(false);
  });
});
