import { describe, expect, it } from "vitest";
import {
  isFresh,
  LIVE_NOW_REFRESH_MS,
  nowTone,
  REFERENCE_PLACE,
  resolveNowPlace,
  splitMinutes,
  whenParts,
  windowNameKey,
  type LiveNow,
} from "./live-now";

const base: LiveNow = {
  v: 1,
  asOf: "2026-10-23T05:00:00.000Z",
  tz: "Asia/Kolkata",
  date: "2026-10-23",
  clock: "10:30",
  tithi: { n: 12, name: "Dwadashi", paksha: "Shukla" },
  nakshatra: { name: "Mrigashira", pada: 2 },
  vara: "Budhvaar",
  hora: { planet: "Mercury", start: "10:00", end: "11:00", good: true },
  choghadiya: { name: "Labh", type: "good", start: "10:30", end: "12:00" },
  rahuKaal: { start: "12:00", end: "13:30", on: false },
  abhijit: { start: "12:06", end: "12:54", on: false },
  nextGood: { label: "Abhijit", start: "12:06", inMin: 96 },
  nextCaution: { label: "Rahu Kaal", start: "12:00", inMin: 90 },
  sunrise: "06:30",
  sunset: "18:30",
};

describe("nowTone", () => {
  it("leads with Rahu Kaal, then Abhijit, then the choghadiya", () => {
    expect(nowTone({ ...base, rahuKaal: { ...base.rahuKaal, on: true }, abhijit: { ...base.abhijit, on: true } })).toBe("caution");
    expect(nowTone({ ...base, abhijit: { ...base.abhijit, on: true } })).toBe("good");
    expect(nowTone(base)).toBe("good");
    expect(nowTone({ ...base, choghadiya: { ...base.choghadiya!, type: "bad" } })).toBe("caution");
    expect(nowTone({ ...base, choghadiya: { ...base.choghadiya!, type: "neutral" } })).toBe("neutral");
    expect(nowTone({ ...base, choghadiya: null })).toBe("neutral");
  });
});

describe("splitMinutes / whenParts", () => {
  it("splits minutes into hours and minutes", () => {
    expect(splitMinutes(65)).toEqual({ hours: 1, minutes: 5 });
    expect(splitMinutes(-5)).toEqual({ hours: 0, minutes: 0 });
  });

  it("uses the short phrase under an hour and the long one from an hour", () => {
    expect(whenParts(35)).toEqual({ key: "inMin", vars: { n: 35 } });
    expect(whenParts(60)).toEqual({ key: "inHm", vars: { h: 1, m: 0 } });
    expect(whenParts(96)).toEqual({ key: "inHm", vars: { h: 1, m: 36 } });
  });
});

describe("windowNameKey", () => {
  it("maps the engine's names onto the muhurta name keys", () => {
    expect(windowNameKey("Abhijit")).toBe("abhijit");
    expect(windowNameKey("Rahu Kaal")).toBe("rahuKaal");
    expect(windowNameKey("Amrit")).toBe("amrit");
  });
});

describe("resolveNowPlace", () => {
  const home = { name: "Dallas", lat: 32.78, lon: -96.8, tz: "America/Chicago" };

  it("keeps the home city while away and keeping home", () => {
    expect(resolveNowPlace(home, { lat: 1, lon: 2 }, "Asia/Kolkata")).toEqual({
      lat: 32.78, lon: -96.8, tz: "America/Chicago", name: "Dallas", reference: false,
    });
  });

  it("otherwise uses the shared position on the device's zone", () => {
    expect(resolveNowPlace(null, { lat: 51.5, lon: -0.12 }, "Europe/London")).toEqual({
      lat: 51.5, lon: -0.12, tz: "Europe/London", name: null, reference: false,
    });
  });

  it("falls back to Delhi, marked as the reference", () => {
    expect(resolveNowPlace(null, null, "America/New_York")).toEqual({ ...REFERENCE_PLACE, reference: true });
  });
});

describe("isFresh", () => {
  it("is good for 15 minutes", () => {
    const built = Date.parse(base.asOf);
    expect(isFresh(base, built + LIVE_NOW_REFRESH_MS - 1)).toBe(true);
    expect(isFresh(base, built + LIVE_NOW_REFRESH_MS)).toBe(false);
    expect(isFresh({ ...base, asOf: "not a date" }, built)).toBe(false);
  });
});
