import { describe, it, expect, beforeEach } from "vitest";
import {
  capturePendingUtmSource,
  getPendingUtmSource,
  clearPendingUtmSource,
  capturePendingReferralCode,
  getPendingReferralCode,
  storePendingReferralCode,
  storePendingUtmSource,
  parseInstallReferrer,
  referralPlayStoreUrl,
} from "./referral";

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

describe("referral Play Store link", () => {
  it("carries the code in Play's referrer parameter, which round-trips through parseInstallReferrer", () => {
    const url = new URL(referralPlayStoreUrl("AB12CD"));
    expect(url.searchParams.get("id")).toBe("com.aroha.astrology");
    const referrer = url.searchParams.get("referrer")!;
    expect(referrer).toBe("utm_source=referral&ref=AB12CD");
    expect(parseInstallReferrer(referrer)).toEqual({ code: "AB12CD", utmSource: "referral" });
  });
});

describe("parseInstallReferrer", () => {
  it("records no source for an organic Play install", () => {
    expect(parseInstallReferrer("utm_source=google-play&utm_medium=organic")).toEqual({ code: null, utmSource: null });
  });

  it("keeps campaign attribution without a code", () => {
    expect(parseInstallReferrer("utm_source=instagram&utm_campaign=diwali")).toEqual({
      code: null,
      utmSource: "instagram/diwali",
    });
  });

  it("uppercases the code and rejects junk", () => {
    expect(parseInstallReferrer("ref=ab12cd").code).toBe("AB12CD");
    expect(parseInstallReferrer("ref=<script>").code).toBeNull();
    expect(parseInstallReferrer("").code).toBeNull();
  });
});

describe("store* never overrides a value the URL already captured", () => {
  it("keeps the ?ref= code over the install referrer's", () => {
    setUrl("?ref=FROMURL");
    capturePendingReferralCode();
    storePendingReferralCode("FROMPLAY");
    expect(getPendingReferralCode()).toBe("FROMURL");
  });

  it("stores the install referrer's values when nothing is pending", () => {
    storePendingReferralCode("fromplay");
    storePendingUtmSource("referral");
    expect(getPendingReferralCode()).toBe("FROMPLAY");
    expect(getPendingUtmSource()).toBe("referral");
  });
});
