import { describe, expect, it } from "vitest";
import { RATE_US_AFTER_OPENS, rateUsDue, recordAppOpen } from "./app-opens";

function store(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe("recordAppOpen", () => {
  it("counts each open and returns the new total", () => {
    const s = store();
    expect(recordAppOpen(s)).toBe(1);
    expect(recordAppOpen(s)).toBe(2);
  });
  it("keeps counting from the counter the old Share prompt kept", () => {
    expect(recordAppOpen(store({ "aroha:appOpens": "5" }))).toBe(6);
  });
  it("returns 0 when storage is blocked, so nothing is asked", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(recordAppOpen(broken)).toBe(0);
  });
});

describe("rateUsDue", () => {
  const base = { seen: false, feedbackGiven: false, onReport: false };
  it("asks from the 3rd open and not before", () => {
    expect(RATE_US_AFTER_OPENS).toBe(3);
    expect(rateUsDue({ ...base, opens: 2 })).toBe(false);
    expect(rateUsDue({ ...base, opens: 3 })).toBe(true);
  });
  it("never again once shown, or once the user rated", () => {
    expect(rateUsDue({ ...base, opens: 9, seen: true })).toBe(false);
    expect(rateUsDue({ ...base, opens: 9, feedbackGiven: true })).toBe(false);
  });
  it("never on a report page", () => {
    expect(rateUsDue({ ...base, opens: 9, onReport: true })).toBe(false);
  });
});
