import { describe, expect, it } from "vitest";
import {
  ageOn,
  ageTicks,
  bandTense,
  barYears,
  chartWidthPx,
  fullDate,
  monthsBetween,
  positionPct,
  relativeFromToday,
  widthPct,
  yearSpan,
} from "./timeline-format";

describe("timeline geometry", () => {
  it("positions dates proportionally and clamps outside the range", () => {
    expect(positionPct("2025-01-01", "2020-01-01", "2030-01-01")).toBeCloseTo(50, 0);
    expect(positionPct("2010-01-01", "2020-01-01", "2030-01-01")).toBe(0);
    expect(positionPct("2040-01-01", "2020-01-01", "2030-01-01")).toBe(100);
  });

  it("keeps even a one-day band tappable", () => {
    expect(widthPct("2025-01-01", "2025-01-02", "1990-01-01", "2070-01-01")).toBe(0.6);
  });

  it("computes age and decade ticks inside the range", () => {
    expect(ageOn("1990-05-15", "2026-09-24")).toBe(36);
    const ticks = ageTicks("1990-05-15", "2023-09-24", "2029-09-24", 5);
    expect(ticks.map((t) => t.age)).toEqual([35]);
    expect(ageTicks("1990-05-15", "1990-05-15", "2070-05-15", 10).map((t) => t.age)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80]);
    expect(ticks.map((t) => t.year)).toEqual([2025]);
  });

  it("sizes the chart at ~36px a year but never below the screen", () => {
    expect(chartWidthPx("1990-01-01", "2070-01-01", 360)).toBe(2880);
    expect(chartWidthPx("2023-01-01", "2029-01-01", 360)).toBe(360);
  });

  it("labels a band's years for the bar and the sheet", () => {
    expect(barYears("2027-03-01", "2027-11-01")).toBe("2027");
    expect(barYears("2027-03-01", "2029-01-12")).toBe("2027–29");
    expect(yearSpan("2027-03-01", "2027-11-01")).toBe("2027");
    expect(yearSpan("2027-03-01", "2029-01-12")).toBe("2027 – 2029");
  });

  it("places a band before, around or after today", () => {
    expect(bandTense("2020-01-01", "2022-01-01", "2026-09-25")).toBe("past");
    expect(bandTense("2026-01-01", "2027-06-01", "2026-09-25")).toBe("now");
    expect(bandTense("2027-03-01", "2029-01-12", "2026-09-25")).toBe("future");
  });

  it("counts whole months and says how far away a date is", () => {
    expect(monthsBetween("2026-09-25", "2027-03-01")).toBe(5);
    expect(monthsBetween("2026-09-25", "2027-03-25")).toBe(6);
    expect(monthsBetween("2026-09-25", "2024-09-30")).toBe(-23);
    expect(relativeFromToday("2027-03-25", "2026-09-25", "en")).toBe("in 6 months");
    expect(relativeFromToday("2024-01-01", "2026-09-25", "en")).toBe("3 years ago");
    expect(relativeFromToday("2026-09-30", "2026-09-25", "en")).toBe("this month");
  });

  it("formats a full date with the year", () => {
    expect(fullDate("2027-03-01", "en")).toBe("Mar 1, 2027");
  });
});
