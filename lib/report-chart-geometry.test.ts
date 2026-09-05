import { describe, it, expect } from "vitest";
import {
  computeTraitBars,
  rightRoundedBarPath,
  scoreToY,
  layoutDecadePoints,
  buildLinePath,
  buildAreaPath,
  parseDateMs,
  computeTimelineDomain,
  dateToXPct,
  windowBarRect,
  buildWindowCurve,
  computeAgeBandSegments,
  formatAgeRange,
} from "./report-chart-geometry";
import type { RankedWindow } from "./report-score-facts";

describe("computeTraitBars", () => {
  it("sorts traits by score descending", () => {
    const bars = computeTraitBars([
      { label: "A", score: 3 },
      { label: "B", score: 8 },
      { label: "C", score: 5 },
    ]);
    expect(bars.map((b) => b.label)).toEqual(["B", "C", "A"]);
  });

  it("scales score/max to a 0-100 pct", () => {
    const bars = computeTraitBars([{ label: "A", score: 5 }], 10);
    expect(bars[0].pct).toBe(50);
  });

  it("clamps an out-of-range score into 0-100", () => {
    const bars = computeTraitBars([
      { label: "over", score: 15 },
      { label: "under", score: -3 },
    ]);
    expect(bars.find((b) => b.label === "over")?.pct).toBe(100);
    expect(bars.find((b) => b.label === "under")?.pct).toBe(0);
  });

  it("does not divide by zero for a zero max", () => {
    const bars = computeTraitBars([{ label: "A", score: 5 }], 0);
    expect(bars[0].pct).toBe(0);
  });

  it("returns an empty array for an empty input", () => {
    expect(computeTraitBars([])).toEqual([]);
  });
});

describe("rightRoundedBarPath", () => {
  it("returns a square path (no arcs) when radius is 0", () => {
    expect(rightRoundedBarPath(0, 0, 20, 10, 0)).toBe("M0,0 h20 v10 h-20 Z");
  });

  it("builds a path with two right-side arcs for a positive radius", () => {
    const d = rightRoundedBarPath(0, 0, 20, 10, 4);
    expect(d).toContain("a4,4 0 0 1");
    expect(d.match(/a4,4/g)).toHaveLength(2);
  });

  it("clamps radius to half the height when the bar is thin", () => {
    const d = rightRoundedBarPath(0, 0, 20, 6, 10);
    expect(d).toContain("a3,3 0 0 1");
  });

  it("returns empty string for a non-positive width", () => {
    expect(rightRoundedBarPath(0, 0, 0, 10, 4)).toBe("");
    expect(rightRoundedBarPath(0, 0, -5, 10, 4)).toBe("");
  });

  it("returns empty string for a non-positive height", () => {
    expect(rightRoundedBarPath(0, 0, 20, 0, 4)).toBe("");
  });
});

describe("scoreToY", () => {
  it("maps max score to the top (y = 0)", () => {
    expect(scoreToY(100, 50, 100)).toBe(0);
  });

  it("maps zero score to the bottom (y = chartHeight)", () => {
    expect(scoreToY(0, 50, 100)).toBe(50);
  });

  it("maps a mid score to the vertical midpoint", () => {
    expect(scoreToY(50, 50, 100)).toBe(25);
  });

  it("clamps an out-of-range score", () => {
    expect(scoreToY(150, 50, 100)).toBe(0);
    expect(scoreToY(-10, 50, 100)).toBe(50);
  });
});

describe("layoutDecadePoints", () => {
  it("spaces multiple bands evenly across the width", () => {
    const points = layoutDecadePoints(
      [
        { label: "20s", startDate: "2020", endDate: "2030", score: 0, tone: "mixed" },
        { label: "30s", startDate: "2030", endDate: "2040", score: 0, tone: "mixed" },
        { label: "40s", startDate: "2040", endDate: "2050", score: 0, tone: "mixed" },
      ],
      100,
      50
    );
    expect(points.map((p) => p.x)).toEqual([0, 50, 100]);
  });

  it("centers a single band", () => {
    const points = layoutDecadePoints(
      [{ label: "20s", startDate: "2020", endDate: "2030", score: 0, tone: "mixed" }],
      100,
      50
    );
    expect(points[0].x).toBe(50);
  });

  it("returns an empty array for an empty list", () => {
    expect(layoutDecadePoints([], 100, 50)).toEqual([]);
  });
});

describe("buildLinePath / buildAreaPath", () => {
  const points = [
    { x: 0, y: 10 },
    { x: 50, y: 5 },
    { x: 100, y: 20 },
  ];

  it("builds an M-then-L path through every point", () => {
    expect(buildLinePath(points)).toBe("M0.00,10.00 L50.00,5.00 L100.00,20.00");
  });

  it("returns empty string for an empty point list", () => {
    expect(buildLinePath([])).toBe("");
    expect(buildAreaPath([], 50)).toBe("");
  });

  it("closes the area path down to the baseline and back to the start", () => {
    const d = buildAreaPath(points, 50);
    expect(d).toBe("M0.00,10.00 L50.00,5.00 L100.00,20.00 L100.00,50.00 L0.00,50.00 Z");
  });
});

describe("parseDateMs", () => {
  it("parses a valid ISO date to epoch ms", () => {
    expect(parseDateMs("2026-01-01")).toBe(new Date("2026-01-01").getTime());
  });

  it("returns NaN (not a throw) for an unparseable string", () => {
    expect(Number.isNaN(parseDateMs("not-a-date"))).toBe(true);
  });
});

describe("computeTimelineDomain", () => {
  it("spans the min start to the max end across all windows", () => {
    const domain = computeTimelineDomain([
      { startDate: "2026-03-01", endDate: "2026-06-01" },
      { startDate: "2026-01-01", endDate: "2026-02-01" },
      { startDate: "2026-05-01", endDate: "2026-09-01" },
    ]);
    expect(domain?.startMs).toBe(new Date("2026-01-01").getTime());
    expect(domain?.endMs).toBe(new Date("2026-09-01").getTime());
  });

  it("pads a zero-width domain (all windows the same single instant) by a day either side", () => {
    const domain = computeTimelineDomain([{ startDate: "2026-01-01", endDate: "2026-01-01" }]);
    const dayMs = 24 * 60 * 60 * 1000;
    expect(domain?.endMs).toBe(domain!.startMs + 2 * dayMs);
  });

  it("returns null for an empty list", () => {
    expect(computeTimelineDomain([])).toBeNull();
  });

  it("returns null when every date is unparseable", () => {
    expect(computeTimelineDomain([{ startDate: "bad", endDate: "also-bad" }])).toBeNull();
  });

  it("ignores unparseable dates mixed with valid ones rather than poisoning the domain with NaN", () => {
    const domain = computeTimelineDomain([
      { startDate: "bad", endDate: "2026-06-01" },
      { startDate: "2026-03-01", endDate: "also-bad" },
    ]);
    expect(domain?.startMs).toBe(new Date("2026-03-01").getTime());
    expect(domain?.endMs).toBe(new Date("2026-06-01").getTime());
  });
});

describe("dateToXPct", () => {
  const domain = { startMs: new Date("2026-01-01").getTime(), endMs: new Date("2026-01-31").getTime() };

  it("maps the domain start to 0", () => {
    expect(dateToXPct("2026-01-01", domain)).toBe(0);
  });

  it("maps the domain end to 100", () => {
    expect(dateToXPct("2026-01-31", domain)).toBe(100);
  });

  it("maps the midpoint to ~50", () => {
    expect(dateToXPct("2026-01-16", domain)).toBeCloseTo(50, 0);
  });

  it("returns 0 for an unparseable date", () => {
    expect(dateToXPct("bad", domain)).toBe(0);
  });

  it("returns 0 for a zero-width domain rather than dividing by zero", () => {
    expect(dateToXPct("2026-01-01", { startMs: 100, endMs: 100 })).toBe(0);
  });
});

describe("windowBarRect", () => {
  const domain = { startMs: new Date("2026-01-01").getTime(), endMs: new Date("2026-01-31").getTime() };

  it("spans the window's start-to-end share of the domain", () => {
    const rect = windowBarRect({ startDate: "2026-01-01", endDate: "2026-01-16" }, domain);
    expect(rect.xPct).toBe(0);
    expect(rect.widthPct).toBeCloseTo(50, 0);
  });

  it("enforces a minimum visible width for a near-instant window", () => {
    const rect = windowBarRect({ startDate: "2026-01-01", endDate: "2026-01-01" }, domain, 1.5);
    expect(rect.widthPct).toBeGreaterThanOrEqual(1.5);
  });

  it("never lets the bar extend past the right edge of the timeline", () => {
    const rect = windowBarRect({ startDate: "2026-01-31", endDate: "2026-01-31" }, domain, 5);
    expect(rect.xPct + rect.widthPct).toBeLessThanOrEqual(100);
  });
});

describe("computeAgeBandSegments", () => {
  it("sizes segments proportionally to their age span", () => {
    const segments = computeAgeBandSegments([
      { label: "Childhood", startAge: 0, endAge: 20, confidence: "HIGH" },
      { label: "Adulthood", startAge: 20, endAge: 60, confidence: "MEDIUM" },
      { label: "Later years", startAge: 60, endAge: 100, confidence: "LOW" },
    ]);
    expect(segments.map((s) => Math.round(s.widthPct))).toEqual([20, 40, 40]);
  });

  it("substitutes assumedMaxAge for an open-ended (null endAge) final band", () => {
    const segments = computeAgeBandSegments(
      [
        { label: "Early", startAge: 0, endAge: 50, confidence: "HIGH" },
        { label: "Late", startAge: 50, endAge: null, confidence: "MEDIUM" },
      ],
      100
    );
    expect(segments[0].widthPct).toBeCloseTo(50, 0);
    expect(segments[1].widthPct).toBeCloseTo(50, 0);
  });

  it("floors a same-age (zero-span) band to a visible sliver rather than 0 width", () => {
    const segments = computeAgeBandSegments([
      { label: "A", startAge: 10, endAge: 10, confidence: "HIGH" },
      { label: "B", startAge: 10, endAge: 90, confidence: "LOW" },
    ]);
    expect(segments[0].widthPct).toBeGreaterThan(0);
  });

  it("returns an empty array for an empty list", () => {
    expect(computeAgeBandSegments([])).toEqual([]);
  });

  it("does not let an open-ended tail band swallow the strip when no assumedMaxAge is given", () => {
    // Reproduces the real report shape that produced illegible "3..", "3..",
    // "41-..." labels: three short, real-span bands followed by an
    // open-ended "49+" band. With a flat assumedMaxAge=100 default, the tail
    // band's assumed span (100-49=51) dwarfs the others (3, 3, 7), squeezing
    // them into a few percent of the strip. The tail's width should instead
    // be capped comparably to its neighbors' real spans.
    const segments = computeAgeBandSegments([
      { label: "Now - 36", startAge: 33, endAge: 36, confidence: "LOW" },
      { label: "37 - 40", startAge: 37, endAge: 40, confidence: "LOW" },
      { label: "41 - 48", startAge: 41, endAge: 48, confidence: "LOW" },
      { label: "49+", startAge: 49, endAge: null, confidence: "NONE" },
    ]);
    const [now36, band37, band41, band49] = segments;
    expect(band49.widthPct).toBeLessThanOrEqual(band41.widthPct * 1.5);
    expect(now36.widthPct).toBeGreaterThan(10);
    expect(band37.widthPct).toBeGreaterThan(10);
  });
});

describe("formatAgeRange", () => {
  it("formats a closed range as start-end", () => {
    expect(formatAgeRange({ startAge: 0, endAge: 18 })).toBe("0-18");
  });

  it("formats an open-ended range (null endAge) with a plus sign", () => {
    expect(formatAgeRange({ startAge: 60, endAge: null })).toBe("60+");
  });

  it("formats a same-age band as a single number", () => {
    expect(formatAgeRange({ startAge: 40, endAge: 40 })).toBe("40");
  });
});

describe("buildWindowCurve", () => {
  const domain = { startMs: new Date("2027-01-01").getTime(), endMs: new Date("2055-01-01").getTime() };
  const windows: RankedWindow[] = [
    { startDate: "2027-09-12", endDate: "2027-11-05", level: "MEDIUM", score: 8, dashaLevel: "antardasha", reasoning: [] },
    { startDate: "2054-11-10", endDate: "2054-12-10", level: "HIGH", score: 6, dashaLevel: "antardasha", reasoning: [] },
  ];

  it("returns one peak marker per window, each at its own midpoint", () => {
    const { peaks } = buildWindowCurve(windows, domain, 300, 60);
    expect(peaks).toHaveLength(2);
    expect(peaks[0].x).toBeLessThan(peaks[1].x);
    expect(peaks.map((p) => p.window.level)).toEqual(["MEDIUM", "HIGH"]);
  });

  it("insets the end windows so their humps aren't sliced by the chart edges", () => {
    const { peaks } = buildWindowCurve(windows, domain, 300, 60);
    expect(peaks[0].x).toBeGreaterThan(0);
    expect(peaks[peaks.length - 1].x).toBeLessThan(300);
  });

  it("gives a HIGH window a taller peak than a MEDIUM one (smaller y = higher)", () => {
    const { peaks } = buildWindowCurve(windows, domain, 300, 60);
    expect(peaks[1].y).toBeLessThan(peaks[0].y);
  });

  it("raises a two-month window inside a 28-year domain well clear of the baseline", () => {
    // The exact failure the Gantt bars had: this window is ~0.5% of the axis.
    const { peaks } = buildWindowCurve(windows, domain, 300, 60);
    expect(peaks[0].y).toBeLessThan(60 * 0.5);
  });

  it("samples a continuous curve that returns to the baseline between distant windows", () => {
    const { points } = buildWindowCurve(windows, domain, 300, 60, 120);
    expect(points).toHaveLength(121);
    expect(points[0].x).toBe(0);
    expect(points[points.length - 1].x).toBe(300);
    expect(Math.max(...points.map((p) => p.y))).toBe(60);
  });
});
