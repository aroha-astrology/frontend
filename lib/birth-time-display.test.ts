import { describe, expect, it } from "vitest";
import { describeBirthTime, isStandInMidpoint, timeFieldsFor } from "./birth-time-display";

describe("describeBirthTime", () => {
  it("shows the clock time for an exact or approximate time", () => {
    expect(describeBirthTime({ time: "06:40:00", accuracy: "exact" })).toEqual({ kind: "clock", hhmm: "06:40" });
    expect(describeBirthTime({ time: "09:00", accuracy: "approximate" })).toEqual({ kind: "clock", hhmm: "09:00" });
    expect(describeBirthTime({ time: "09:00:00", accuracy: null })).toEqual({ kind: "clock", hhmm: "09:00" });
  });

  it.each([
    ["01:30", "late_night"],
    ["04:30", "early_morning"],
    ["09:00", "morning"],
    ["14:00", "afternoon"],
    ["18:00", "evening"],
    ["22:00", "night"],
  ])("shows the part of the day for the unknown-time stand-in %s", (time, key) => {
    const d = describeBirthTime({ time: `${time}:00`, accuracy: "unknown" });
    expect(d.kind).toBe("window");
    if (d.kind === "window") expect(d.key).toBe(key);
  });

  it("says no time was given for unknown at exactly 12:00", () => {
    expect(describeBirthTime({ time: "12:00:00", accuracy: "unknown" })).toEqual({ kind: "none" });
  });

  it("keeps the clock time of an unknown-rated time the reader typed themselves", () => {
    expect(describeBirthTime({ time: "09:37", accuracy: "unknown" })).toEqual({ kind: "clock", hhmm: "09:37" });
  });

  it("returns none without a time", () => {
    expect(describeBirthTime({ time: null, accuracy: "unknown" })).toEqual({ kind: "none" });
    expect(describeBirthTime({ time: "", accuracy: "exact" })).toEqual({ kind: "none" });
  });

  it("only treats the six stand-ins as midpoints", () => {
    expect(isStandInMidpoint("09:00:00")).toBe(true);
    expect(isStandInMidpoint("09:01")).toBe(false);
    expect(isStandInMidpoint("12:00")).toBe(false);
  });
});

describe("timeFieldsFor", () => {
  it("fills the form from a saved time without inventing a clock time", () => {
    expect(timeFieldsFor("14:30:00", "exact")).toEqual({ time: "14:30", timeWindow: "" });
    expect(timeFieldsFor("18:00:00", "unknown")).toEqual({ time: "", timeWindow: "evening" });
    expect(timeFieldsFor("12:00", "unknown")).toEqual({ time: "", timeWindow: "" });
    expect(timeFieldsFor(null, null)).toEqual({ time: "", timeWindow: "" });
  });
});
