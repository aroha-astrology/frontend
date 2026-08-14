import { describe, it, expect } from "vitest";
import { buildPastLifeView, SECTION_ICON } from "./past-life-report-view";

function scores(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    rahuHouse: 3,
    rahuSign: "Gemini",
    ketuHouse: 9,
    ketuSign: "Sagittarius",
    twelfthLordStrength: "average",
    conjunctPlanets: ["Mars", "Mercury"],
    karmicArchetype: { label: "The Seeker", description: "Knowledge earned, wisdom still owed." },
    ...overrides,
  };
}

describe("buildPastLifeView", () => {
  it("reads both node placements", () => {
    const v = buildPastLifeView(scores());
    expect(v.rahu).toEqual({ node: "rahu", house: 3, sign: "Gemini" });
    expect(v.ketu).toEqual({ node: "ketu", house: 9, sign: "Sagittarius" });
  });

  it("names the axis by its lower house, whichever node sits where", () => {
    expect(buildPastLifeView(scores()).axisId).toBe(3);
    expect(buildPastLifeView(scores({ rahuHouse: 9, ketuHouse: 3 })).axisId).toBe(3);
    expect(buildPastLifeView(scores({ rahuHouse: 1, ketuHouse: 7 })).axisId).toBe(1);
  });

  it("shows no axis when the nodes are not a true 7 houses apart", () => {
    // The backend reads each node from the chart rather than assuming the opposition, so a
    // chart that disagrees must not produce a confidently wrong axis.
    expect(buildPastLifeView(scores({ ketuHouse: 8 })).axisId).toBeNull();
    expect(buildPastLifeView(scores({ ketuHouse: null })).axisId).toBeNull();
  });

  it("rejects house numbers outside 1-12", () => {
    expect(buildPastLifeView(scores({ rahuHouse: 0 })).rahu.house).toBeNull();
    expect(buildPastLifeView(scores({ rahuHouse: 13 })).rahu.house).toBeNull();
    expect(buildPastLifeView(scores({ rahuHouse: 3.5 })).rahu.house).toBeNull();
  });

  it("lowercases conjunct planets for the planet assets and drops blanks", () => {
    expect(buildPastLifeView(scores({ conjunctPlanets: ["Mars", "", "Venus", 7] })).conjunctPlanets)
      .toEqual(["mars", "venus"]);
  });

  it("requires both label and description before showing an archetype", () => {
    expect(buildPastLifeView(scores()).archetype).toEqual({
      label: "The Seeker",
      description: "Knowledge earned, wisdom still owed.",
    });
    expect(buildPastLifeView(scores({ karmicArchetype: { label: "X" } })).archetype).toBeNull();
  });

  it("degrades to nulls and empties on an empty scores bag rather than throwing", () => {
    const v = buildPastLifeView({});
    expect(v).toEqual({
      rahu: { node: "rahu", house: null, sign: null },
      ketu: { node: "ketu", house: null, sign: null },
      axisId: null,
      archetype: null,
      twelfthLordStrength: null,
      conjunctPlanets: [],
    });
  });

  it("names a lucide icon for every one of the backend's 3 section ids", () => {
    expect(Object.keys(SECTION_ICON)).toEqual([
      "karmic_pattern",
      "karmic_axis_theme",
      "unfinished_business_soul_lesson",
    ]);
  });
});
