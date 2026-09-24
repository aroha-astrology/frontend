import { describe, expect, it } from "vitest";
import { ageOn, ageTicks, chartWidthPx, positionPct, widthPct } from "./timeline-format";

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
  });

  it("sizes the chart at ~36px a year but never below the screen", () => {
    expect(chartWidthPx("1990-01-01", "2070-01-01", 360)).toBe(2880);
    expect(chartWidthPx("2023-01-01", "2029-01-01", 360)).toBe(360);
  });
});
