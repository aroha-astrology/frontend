import { describe, expect, it } from "vitest";
import { formatClock, formatClockRange, moonLitPath, moonPhase, storyDateLabel } from "./format";

describe("formatClock", () => {
  it("turns the engine's 24-hour strings into AM/PM", () => {
    expect(formatClock("09:28")).toBe("9:28 AM");
    expect(formatClock("00:35")).toBe("12:35 AM");
    expect(formatClock("12:05")).toBe("12:05 PM");
    expect(formatClock("22:19")).toBe("10:19 PM");
  });

  it("shows nothing for a missing time and leaves an unreadable one alone", () => {
    expect(formatClock(undefined)).toBe("");
    expect(formatClock(null)).toBe("");
    expect(formatClock("soon")).toBe("soon");
  });

  it("joins a range", () => {
    expect(formatClockRange("09:28", "10:28")).toBe("9:28 AM – 10:28 AM");
  });
});

describe("storyDateLabel", () => {
  it("names the weekday, day and month", () => {
    expect(storyDateLabel(new Date(2026, 9, 6), "en")).toBe("Tue, 6 October");
  });

  it("falls back to English for a language code Intl rejects", () => {
    expect(storyDateLabel(new Date(2026, 9, 6), "not a locale")).toBe("Tue, 6 October");
  });
});

describe("moonPhase", () => {
  it("grows to full at Purnima and empties by Amavasya", () => {
    expect(moonPhase(15)).toEqual({ lit: 1, waxing: true });
    expect(moonPhase(30)).toEqual({ lit: 0, waxing: false });
    expect(moonPhase(8).waxing).toBe(true);
    expect(moonPhase(8).lit).toBeCloseTo(8 / 15);
  });

  it("reads Krishna Ekadashi (26) as a thin waning moon", () => {
    const phase = moonPhase(26);
    expect(phase.waxing).toBe(false);
    expect(phase.lit).toBeCloseTo(4 / 15);
  });

  it("clamps a number outside 1 to 30", () => {
    expect(moonPhase(0)).toEqual(moonPhase(1));
    expect(moonPhase(99)).toEqual(moonPhase(30));
  });
});

describe("moonLitPath", () => {
  it("is a straight terminator at half moon and a full disc at full moon", () => {
    expect(moonLitPath(0.5, 10)).toBe("M 0 -10 A 10 10 0 0 1 0 10 A 0.00 10 0 0 0 0 -10 Z");
    expect(moonLitPath(1, 10)).toBe("M 0 -10 A 10 10 0 0 1 0 10 A 10.00 10 0 0 1 0 -10 Z");
  });

  it("curves the terminator towards the lit side for a crescent", () => {
    expect(moonLitPath(0.25, 10)).toBe("M 0 -10 A 10 10 0 0 1 0 10 A 5.00 10 0 0 0 0 -10 Z");
  });
});
