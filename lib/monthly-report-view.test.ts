import { describe, it, expect } from "vitest";
import { buildMonthlyView, industrySlug } from "./monthly-report-view";

/** A representative career_monthly `scores` bag, shaped as the backend returns it
 * (see astro-engine/reports/career-monthly.ts + monthly-dasha-context.ts). */
function scores(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    periodMonth: "2026-09",
    activeMahadashaLord: "Jupiter",
    activeAntardashaLord: "Saturn",
    monthScore: 60,
    keyHouses: [1, 6, 10, 11],
    tone: "mixed",
    subPeriods: [
      { startDate: "2026-09-01T00:00:00.000Z", endDate: "2026-09-09T00:00:00.000Z", lord: "Saturn", score: 60 },
      { startDate: "2026-09-10T00:00:00.000Z", endDate: "2026-09-19T00:00:00.000Z", lord: "Mercury", score: 78 },
      { startDate: "2026-09-20T00:00:00.000Z", endDate: "2026-09-30T00:00:00.000Z", lord: "Mars", score: 42 },
    ],
    ...overrides,
  };
}

describe("buildMonthlyView", () => {
  it("reads the month's core facts and lowercases lords for the planet assets", () => {
    const v = buildMonthlyView(scores());
    expect(v.periodMonth).toBe("2026-09");
    expect(v.score).toBe(60);
    expect(v.tone).toBe("mixed");
    expect(v.mahadashaLord).toBe("jupiter");
    expect(v.antardashaLord).toBe("saturn");
    expect(v.keyHouses).toEqual([1, 6, 10, 11]);
  });

  it("trims serialised Date strings back to a plain date", () => {
    expect(buildMonthlyView(scores()).subPeriods[0]).toMatchObject({
      startDate: "2026-09-01",
      endDate: "2026-09-09",
    });
  });

  it("flags only the slices that differ meaningfully from the month's own score", () => {
    const v = buildMonthlyView(scores());
    expect(v.subPeriods.map((s) => s.standout)).toEqual([null, "better", "worse"]);
  });

  it("does not flag a slice inside the noise margin", () => {
    const v = buildMonthlyView(
      scores({
        subPeriods: [
          { startDate: "2026-09-01", endDate: "2026-09-15", lord: "Sun", score: 69 },
          { startDate: "2026-09-16", endDate: "2026-09-30", lord: "Moon", score: 51 },
        ],
      })
    );
    expect(v.subPeriods.map((s) => s.standout)).toEqual([null, null]);
  });

  it("drops malformed sub-periods rather than rendering a broken row", () => {
    const v = buildMonthlyView(
      scores({
        subPeriods: [
          { startDate: "2026-09-01", endDate: "2026-09-09", lord: "Saturn", score: 60 },
          { startDate: "2026-09-10", lord: "Mercury", score: 78 },
          { startDate: "2026-09-20", endDate: "2026-09-30", lord: "", score: 42 },
          "nope",
        ],
      })
    );
    expect(v.subPeriods).toHaveLength(1);
  });

  it("rejects a tone the backend does not emit", () => {
    expect(buildMonthlyView(scores({ tone: "catastrophic" })).tone).toBeNull();
  });

  it("degrades to nulls and empties on an empty scores bag rather than throwing", () => {
    expect(buildMonthlyView({})).toEqual({
      periodMonth: null,
      score: null,
      tone: null,
      mahadashaLord: null,
      antardashaLord: null,
      keyHouses: [],
      subPeriods: [],
    });
  });

  it("slugs industry names into i18n-key-safe fragments", () => {
    expect(industrySlug("long-term/structural work")).toBe("long_term_structural_work");
    expect(industrySlug("public-facing work")).toBe("public_facing_work");
    expect(industrySlug("spirituality/mysticism")).toBe("spirituality_mysticism");
    expect(industrySlug("government")).toBe("government");
  });
});
