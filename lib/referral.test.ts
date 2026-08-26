import { describe, it, expect, beforeEach } from "vitest";
import { capturePendingUtmSource, getPendingUtmSource, clearPendingUtmSource } from "./referral";

const store = new Map<string, string>();

// referral.ts reads/writes the BARE `localStorage` global (matching the
// existing capturePendingReferralCode), not `window.localStorage` — both
// globals have to be stubbed for the `typeof window === "undefined"` guard
// to pass AND for the storage calls to land in our fake store.
function setUrl(search: string) {
  (globalThis as unknown as { window: { location: { search: string } } }).window = {
    location: { search },
  };
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

beforeEach(() => {
  store.clear();
  setUrl("");
});

describe("pending UTM source capture", () => {
  it("captures utm_source alone", () => {
    setUrl("?utm_source=telegram_broadcast");
    capturePendingUtmSource();
    expect(getPendingUtmSource()).toBe("telegram_broadcast");
  });

  it("combines utm_source and utm_campaign as source/campaign", () => {
    setUrl("?utm_source=telegram_broadcast&utm_campaign=diwali");
    capturePendingUtmSource();
    expect(getPendingUtmSource()).toBe("telegram_broadcast/diwali");
  });

  it("does nothing when utm_source is absent", () => {
    setUrl("?ref=ABC123");
    capturePendingUtmSource();
    expect(getPendingUtmSource()).toBeNull();
  });

  it("clears the stashed value", () => {
    setUrl("?utm_source=whatsapp");
    capturePendingUtmSource();
    clearPendingUtmSource();
    expect(getPendingUtmSource()).toBeNull();
  });
});
