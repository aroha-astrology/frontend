import { describe, expect, it } from "vitest";
import { cityFromZone, homeOverride, sameZone, travelState, type SkyContext } from "./sky";

const mumbai = { name: "Mumbai", lat: 19.07, lon: 72.87, tz: "Asia/Kolkata" };

const ctx = (over: Partial<SkyContext> = {}): SkyContext => ({
  travelPill: true,
  nriMode: false,
  homeLocation: mumbai,
  homeTimezone: "Asia/Kolkata",
  skyMode: "HOME",
  skyDismissedTz: null,
  isNri: false,
  ...over,
});

describe("sameZone", () => {
  it("treats old and new spellings of one zone as the same", () => {
    expect(sameZone("Asia/Calcutta", "Asia/Kolkata")).toBe(true);
    expect(sameZone("America/New_York", "Asia/Kolkata")).toBe(false);
  });
});

describe("travelState", () => {
  it("shows nothing while the switch is off", () => {
    expect(travelState(ctx({ travelPill: false }), "America/New_York")).toEqual({ kind: "none" });
  });

  it("remembers the device's zone as home the first time", () => {
    expect(travelState(ctx({ homeTimezone: null, homeLocation: null }), "Asia/Kolkata")).toEqual({ kind: "adopt-home" });
  });

  it("at home there is nothing to ask", () => {
    expect(travelState(ctx(), "Asia/Calcutta")).toEqual({ kind: "none" });
  });

  it("away from home and not yet answered: ask", () => {
    expect(travelState(ctx(), "America/New_York")).toEqual({ kind: "ask", deviceTz: "America/New_York" });
  });

  it("following the device while away stays 'away'; coming home resets", () => {
    expect(travelState(ctx({ skyMode: "TRAVEL_SYNCED" }), "America/New_York")).toEqual({ kind: "away" });
    expect(travelState(ctx({ skyMode: "TRAVEL_SYNCED" }), "Asia/Kolkata")).toEqual({ kind: "home-again" });
  });

  it("'keep home' holds for that zone only, and asks again in a new one", () => {
    const kept = ctx({ skyMode: "TRAVEL_DISMISSED", skyDismissedTz: "America/New_York" });
    expect(travelState(kept, "America/New_York")).toEqual({ kind: "none" });
    expect(travelState(kept, "Europe/London")).toEqual({ kind: "ask", deviceTz: "Europe/London" });
  });
});

describe("homeOverride", () => {
  const kept = ctx({ skyMode: "TRAVEL_DISMISSED", skyDismissedTz: "America/New_York" });

  it("uses the home city only when the user is away and chose to keep home", () => {
    expect(homeOverride(kept, "America/New_York")).toEqual(mumbai);
    expect(homeOverride(ctx(), "America/New_York")).toBeNull();
    expect(homeOverride(ctx({ skyMode: "TRAVEL_SYNCED" }), "America/New_York")).toBeNull();
  });

  it("does not apply back at home, in another zone, with no home city, or with the switch off", () => {
    expect(homeOverride(kept, "Asia/Kolkata")).toBeNull();
    expect(homeOverride(kept, "Europe/London")).toBeNull();
    expect(homeOverride({ ...kept, homeLocation: null }, "America/New_York")).toBeNull();
    expect(homeOverride({ ...kept, travelPill: false }, "America/New_York")).toBeNull();
    expect(homeOverride(null, "America/New_York")).toBeNull();
  });
});

describe("cityFromZone", () => {
  it("makes a readable name from a zone", () => {
    expect(cityFromZone("America/New_York")).toBe("New York");
    expect(cityFromZone("Asia/Kolkata")).toBe("Kolkata");
  });
});
