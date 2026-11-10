import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearDraft, markResume, placeIsUsable, readDraft, takeResume, varshikBirthGaps, writeDraft } from "./varshik-birth";

const place = { name: "Pune", lat: 18.52, lon: 73.86, tz: "Asia/Kolkata" };

describe("varshikBirthGaps (same rule as the server's varshikBirthDataProblem)", () => {
  it("sells on an exact time and a full place", () => {
    expect(varshikBirthGaps({ timeOfBirth: "07:40", birthTimeAccuracy: "exact", placeOfBirth: place })).toEqual([]);
  });

  it("asks to confirm a remembered time and a time saved before accuracy was asked", () => {
    for (const birthTimeAccuracy of ["approximate", null] as const) {
      expect(varshikBirthGaps({ timeOfBirth: "07:40", birthTimeAccuracy, placeOfBirth: place })).toEqual(["time_unconfirmed"]);
    }
  });

  it("asks for a real time over a part-of-day window, and for a time that is missing", () => {
    expect(varshikBirthGaps({ timeOfBirth: "06:00", birthTimeAccuracy: "unknown", placeOfBirth: place })).toEqual(["time_window"]);
    expect(varshikBirthGaps({ timeOfBirth: null, birthTimeAccuracy: null, placeOfBirth: place })).toEqual(["time_missing"]);
  });

  it("asks for a place without coordinates or a zone, after the time", () => {
    expect(varshikBirthGaps({ timeOfBirth: null, birthTimeAccuracy: null, placeOfBirth: null })).toEqual(["time_missing", "place_missing"]);
    expect(placeIsUsable({ ...place, tz: "" })).toBe(false);
    expect(placeIsUsable({ ...place, lat: Number.NaN })).toBe(false);
    expect(placeIsUsable(place)).toBe(true);
  });
});

describe("the half-filled purchase sheet", () => {
  // The unit tests run in plain Node (no browser), so the page's storage is a small in-memory stand-in.
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    });
  });

  it("keeps the plan and answers per report and profile until the purchase", () => {
    writeDraft("varshik_rashifal_2027", "primary", { tier: "gold", answers: { travelPlan: "abroad" } });
    expect(readDraft("varshik_rashifal_2027", "primary")).toMatchObject({ tier: "gold", answers: { travelPlan: "abroad" } });
    expect(readDraft("varshik_rashifal_2027", "some-family-profile")).toBeNull();
    clearDraft("varshik_rashifal_2027", "primary");
    expect(readDraft("varshik_rashifal_2027", "primary")).toBeNull();
  });

  it("forgets a draft older than a week", () => {
    writeDraft("varshik_rashifal_2027", "primary", { tier: "gold", answers: {} });
    expect(readDraft("varshik_rashifal_2027", "primary", Date.now() + 8 * 24 * 3600 * 1000)).toBeNull();
  });

  it("reopens the sheet once after the birth time check", () => {
    markResume("varshik_rashifal_2027");
    expect(takeResume()).toBe("varshik_rashifal_2027");
    expect(takeResume()).toBeNull();
  });
});
