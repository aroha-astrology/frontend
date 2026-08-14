import { describe, it, expect } from "vitest";
import { buildWealthView, toWealthBand, SECTION_ICON } from "./wealth-report-view";

/** A representative wealth `scores` bag, shaped as the backend returns it
 * (see astro-engine/reports/wealth.ts). */
function scores(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    wealthScore: 70,
    secondLordStrength: "strong",
    eleventhLordStrength: "average",
    jupiterStrength: "weak",
    jupiterHouse: 6,
    wealthPattern: "steady_accumulation",
    spendingVsSavingTilt: 2.5,
    incomeSourceStrengths: { salaried: "strong", business: "average", property: "weak" },
    strongestIncomeSource: "salaried",
    ...overrides,
  };
}

describe("buildWealthView", () => {
  it("bands the overall score on the wealth scale, not marriage's", () => {
    // 70 would be "good" on both scales, so prove the lower cut-points with a mid score.
    expect(buildWealthView(scores()).band).toBe("good");
    expect(toWealthBand(80)).toBe("excellent");
    expect(toWealthBand(60)).toBe("good");
    expect(toWealthBand(45)).toBe("average");
    expect(toWealthBand(39)).toBe("weak");
  });

  it("reads the 3-way wealth pattern only when it is one the backend emits", () => {
    expect(buildWealthView(scores()).pattern).toBe("steady_accumulation");
    expect(buildWealthView(scores({ wealthPattern: "getting_rich_quick" })).pattern).toBeNull();
  });

  it("maps the saving/spending tilt with a wide neutral band", () => {
    expect(buildWealthView(scores()).tilt).toEqual({ pct: 25, lean: "low" });
    expect(buildWealthView(scores({ spendingVsSavingTilt: 5 })).tilt?.lean).toBe("mid");
    expect(buildWealthView(scores({ spendingVsSavingTilt: 9 })).tilt?.lean).toBe("high");
  });

  it("clamps rather than drawing a marker off the end of the track", () => {
    expect(buildWealthView(scores({ spendingVsSavingTilt: 42 })).tilt).toEqual({
      pct: 100,
      lean: "high",
    });
    expect(buildWealthView(scores({ wealthScore: 900 })).score).toBe(100);
  });

  it("lists the three significators and carries Jupiter's house only", () => {
    const sig = buildWealthView(scores()).significators;
    expect(sig).toEqual([
      { role: "secondLord", strength: "strong", house: null },
      { role: "eleventhLord", strength: "average", house: null },
      { role: "jupiter", strength: "weak", house: 6 },
    ]);
  });

  it("drops a significator whose strength is missing rather than inventing one", () => {
    const sig = buildWealthView(scores({ eleventhLordStrength: undefined })).significators;
    expect(sig.map((s) => s.role)).toEqual(["secondLord", "jupiter"]);
  });

  it("orders income paths canonically and flags exactly the backend's winner", () => {
    const paths = buildWealthView(scores()).incomePaths;
    expect(paths.map((p) => p.key)).toEqual(["salaried", "business", "property"]);
    expect(paths.filter((p) => p.strongest).map((p) => p.key)).toEqual(["salaried"]);
  });

  it("flags nothing when the backend's winner is absent, rather than guessing the highest", () => {
    const paths = buildWealthView(scores({ strongestIncomeSource: undefined })).incomePaths;
    expect(paths.some((p) => p.strongest)).toBe(false);
  });

  it("degrades to nulls and empties on an empty scores bag rather than throwing", () => {
    expect(buildWealthView({})).toEqual({
      score: null,
      band: null,
      pattern: null,
      tilt: null,
      significators: [],
      incomePaths: [],
    });
  });

  it("names a lucide icon for every one of the backend's 9 section ids", () => {
    expect(Object.keys(SECTION_ICON)).toEqual([
      "wealth_pattern",
      "practical_guidance",
      "wealth_timing",
      "money_archetype",
      "dosha_yoga_check",
      "spending_vs_saving_tilt",
      "wealth_by_decade",
      "strongest_income_path",
      "guard_against",
    ]);
  });
});
