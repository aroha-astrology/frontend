import { describe, it, expect, beforeEach } from "vitest";
import { isPushRefreshDue, markPushRefreshed } from "./device-id";

/**
 * The throttle used to be per install, so a second account signing in on the
 * same phone registered no FCM token at all (PermissionsPrompt skips
 * registration outright when the OS already reports `granted`, leaving the
 * listener as the only path — and the listener was throttled). That account
 * was then invisible to every push until the 24h window lapsed.
 */
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  };
});

describe("push refresh throttle", () => {
  it("is due for a user who has never registered", () => {
    expect(isPushRefreshDue("user-a")).toBe(true);
  });

  it("throttles the same user after a registration", () => {
    markPushRefreshed("user-a");
    expect(isPushRefreshDue("user-a")).toBe(false);
  });

  it("is still due for a DIFFERENT user on the same install", () => {
    markPushRefreshed("user-a");
    expect(isPushRefreshDue("user-b")).toBe(true);
  });

  it("is due again once the window has lapsed", () => {
    store.set("aroha:pushRefreshedAt:v2:user-a", String(Date.now() - 25 * 60 * 60 * 1000));
    expect(isPushRefreshDue("user-a")).toBe(true);
  });

  it("fails open on a corrupt or future timestamp", () => {
    store.set("aroha:pushRefreshedAt:v2:user-a", "not-a-number");
    expect(isPushRefreshDue("user-a")).toBe(true);
    store.set("aroha:pushRefreshedAt:v2:user-a", String(Date.now() + 60 * 60 * 1000));
    expect(isPushRefreshDue("user-a")).toBe(true);
  });

  it("never claims 'due' without a user id", () => {
    expect(isPushRefreshDue("")).toBe(false);
  });
});
