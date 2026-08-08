import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isPushRefreshDue, markPushRefreshed } from "./device-id";

// vitest.config.ts deliberately runs the default "node" environment and asks
// that a single DOM-touching test not switch the whole project over. These
// helpers only need localStorage, so a Map-backed stub beats pulling in jsdom.
const store = new Map<string, string>();
const windowStub = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  },
};

const DAY = 24 * 60 * 60 * 1000;
const KEY = "aroha:pushRefreshedAt:v1";

describe("isPushRefreshDue", () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", windowStub);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("is due on a fresh install (nothing stored yet)", () => {
    expect(isPushRefreshDue()).toBe(true);
  });

  it("is not due again right after a refresh", () => {
    markPushRefreshed();
    expect(isPushRefreshDue()).toBe(false);
  });

  it("is not due part-way through the window", () => {
    markPushRefreshed();
    vi.advanceTimersByTime(DAY - 1000);
    expect(isPushRefreshDue()).toBe(false);
  });

  it("is due again once a full day has passed", () => {
    markPushRefreshed();
    vi.advanceTimersByTime(DAY);
    expect(isPushRefreshDue()).toBe(true);
  });

  // A corrupt value must fail OPEN (due), not closed — failing closed would
  // permanently disable the token self-heal for that install.
  it("is due when the stored value is unparseable", () => {
    store.set(KEY, "not-a-number");
    expect(isPushRefreshDue()).toBe(true);
  });

  // A clock that jumped backwards leaves a future timestamp behind. Being due
  // early only costs one extra getToken(); being stuck forever loses push.
  it("is due when the stored timestamp is in the future", () => {
    store.set(KEY, String(Date.now() + 10 * DAY));
    expect(isPushRefreshDue()).toBe(true);
  });
});
