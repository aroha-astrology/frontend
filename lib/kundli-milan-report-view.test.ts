import { describe, it, expect } from "vitest";
import { buildKundliMilanView, SECTION_ICON } from "./kundli-milan-report-view";
import { MATCH_RISK_AREA_ORDER } from "./reports-api";

/** A representative kundli_milan `scores` bag, shaped exactly as the backend returns it
 * (see astro-engine/reports/kundli-milan.ts's computeKundliMilanScores). */
function scores(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gunaMilanScore: 27,
    gunaMaxScore: 36,
    gunaBreakdown: [
      { name: "Varna", score: 1, maxScore: 1, description: "Compatible varna" },
      { name: "Nadi", score: 0, maxScore: 8, description: "Same nadi - a classical flag" },
    ],
    dashakootaScore: 7,
    dashakootaMaxScore: 10,
    dashakootaBreakdown: [
      { name: "Dina", score: 1, maxScore: 1, description: "Favourable" },
    ],
    dashakootaCompatibility: "good",
    manglikStatus: { person1: true, person2: true, cancelled: false },
    compatibilityBand: "good",
    riskFactors: [
      { key: "wealth", severity: "benefit", score: 80, evidence: [] },
      { key: "health", severity: "neutral", score: 55, evidence: [] },
      { key: "children", severity: "caution", score: 40, evidence: [] },
      { key: "harmony", severity: "serious", score: 20, evidence: [] },
    ],
    ...overrides,
  };
}

describe("buildKundliMilanView", () => {
  it("maps the guna score, its max and the arc percentage", () => {
    expect(buildKundliMilanView(scores()).guna).toEqual({ score: 27, max: 36, pct: 75 });
  });

  it("prefers the backend's own band over re-deriving one", () => {
    // 27/36 would re-derive as "good" too, so force a disagreement to prove which wins.
    expect(buildKundliMilanView(scores({ compatibilityBand: "excellent" })).band).toBe("excellent");
  });

  it("falls back to the classical 36-point banding when the band is missing", () => {
    expect(buildKundliMilanView(scores({ compatibilityBand: undefined })).band).toBe("good");
    expect(
      buildKundliMilanView(scores({ compatibilityBand: undefined, gunaMilanScore: 12 })).band
    ).toBe("poor");
    expect(
      buildKundliMilanView(scores({ compatibilityBand: undefined, gunaMilanScore: 34 })).band
    ).toBe("excellent");
  });

  it("does not band a non-classical maximum", () => {
    const v = buildKundliMilanView(
      scores({ compatibilityBand: undefined, gunaMilanScore: 9, gunaMaxScore: 10 })
    );
    expect(v.band).toBeNull();
    expect(v.guna).toEqual({ score: 9, max: 10, pct: 90 });
  });

  it("treats both-manglik and neither-manglik as matched, one-sided as not", () => {
    expect(buildKundliMilanView(scores()).manglik?.matched).toBe(true);
    expect(
      buildKundliMilanView(scores({ manglikStatus: { person1: false, person2: false } })).manglik
        ?.matched
    ).toBe(true);
    expect(
      buildKundliMilanView(scores({ manglikStatus: { person1: true, person2: false } })).manglik
        ?.matched
    ).toBe(false);
  });

  it("orders life areas canonically and counts benefits vs cautions", () => {
    const v = buildKundliMilanView(scores());
    expect(v.areas.map((a) => a.key)).toEqual(["wealth", "health", "children", "harmony"]);
    expect(v.benefitCount).toBe(1);
    expect(v.cautionCount).toBe(2); // caution + serious
  });

  it("keeps canonical order regardless of the order the backend sent", () => {
    const reversed = [...MATCH_RISK_AREA_ORDER].reverse().map((key) => ({
      key,
      severity: "neutral",
      score: 50,
      evidence: [],
    }));
    const v = buildKundliMilanView(scores({ riskFactors: reversed }));
    expect(v.areas.map((a) => a.key)).toEqual([...MATCH_RISK_AREA_ORDER]);
  });

  it("drops malformed and unrecognised risk factors rather than rendering them", () => {
    const v = buildKundliMilanView(
      scores({
        riskFactors: [
          { key: "wealth", severity: "benefit" },
          { key: "wealth_v2", severity: "benefit" },
          { key: "health", severity: "catastrophic" },
          "not-an-object",
        ],
      })
    );
    expect(v.areas).toEqual([{ key: "wealth", severity: "benefit" }]);
  });

  it("degrades to nulls and empties on an empty scores bag rather than throwing", () => {
    const v = buildKundliMilanView({});
    expect(v).toMatchObject({
      guna: null,
      band: null,
      dashakoota: null,
      dashakootaVerdict: null,
      gunaBreakdown: [],
      dashakootaBreakdown: [],
      manglik: null,
      areas: [],
      benefitCount: 0,
      cautionCount: 0,
    });
  });

  it("rejects a zero maximum instead of dividing by it", () => {
    expect(buildKundliMilanView(scores({ gunaMaxScore: 0 })).guna).toBeNull();
  });

  it("clamps the arc percentage without misreporting the score itself", () => {
    const v = buildKundliMilanView(scores({ gunaMilanScore: 40 }));
    expect(v.guna).toEqual({ score: 40, max: 36, pct: 100 });
  });

  it("names a lucide icon for every one of the backend's 7 section ids", () => {
    expect(Object.keys(SECTION_ICON)).toEqual([
      "guna_milan_score_meaning",
      "dashakoota_deep_dive",
      "manglik_compatibility",
      "chart_additional_facts",
      "overall_recommendation",
      "health_wealth_career_compatibility",
      "children_family_harmony_timing",
    ]);
  });
});
