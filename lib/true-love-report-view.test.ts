import { describe, it, expect } from "vitest";
import { buildTrueLoveView, toLoveBand, SECTION_ICON } from "./true-love-report-view";

/** A representative true_love `scores` bag, shaped as the backend returns it
 * (see astro-engine/reports/true-love.ts). */
function scores(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    romanceScore: 74,
    partnershipScore: 61,
    venusInKeyHouse: true,
    loveVsArrangedTilt: 7.2,
    ...overrides,
  };
}

describe("buildTrueLoveView", () => {
  it("bands both dials independently", () => {
    const v = buildTrueLoveView(scores());
    expect(v.romance).toEqual({ score: 74, band: "good" });
    expect(v.partnership).toEqual({ score: 61, band: "average" });
  });

  it("bands at the boundaries the mock defines", () => {
    expect(toLoveBand(90)).toBe("excellent");
    expect(toLoveBand(89)).toBe("good");
    expect(toLoveBand(70)).toBe("good");
    expect(toLoveBand(69)).toBe("average");
  });

  it("maps the 0-10 tilt onto a percentage and a direction", () => {
    expect(buildTrueLoveView(scores()).tilt).toEqual({ pct: 72, lean: "love" });
    expect(buildTrueLoveView(scores({ loveVsArrangedTilt: 2 })).tilt).toEqual({
      pct: 20,
      lean: "arranged",
    });
  });

  it("keeps the neutral band wide rather than splitting hairs at the midpoint", () => {
    for (const raw of [4, 5, 6]) {
      expect(buildTrueLoveView(scores({ loveVsArrangedTilt: raw })).tilt?.lean).toBe("balanced");
    }
    expect(buildTrueLoveView(scores({ loveVsArrangedTilt: 6.1 })).tilt?.lean).toBe("love");
    expect(buildTrueLoveView(scores({ loveVsArrangedTilt: 3.9 })).tilt?.lean).toBe("arranged");
  });

  it("clamps out-of-range values instead of drawing a bar past its track", () => {
    expect(buildTrueLoveView(scores({ loveVsArrangedTilt: 99 })).tilt).toEqual({
      pct: 100,
      lean: "love",
    });
    expect(buildTrueLoveView(scores({ romanceScore: 140 })).romance?.score).toBe(100);
    expect(buildTrueLoveView(scores({ romanceScore: -5 })).romance?.score).toBe(0);
  });

  it("distinguishes a false venusInKeyHouse from an absent one", () => {
    expect(buildTrueLoveView(scores({ venusInKeyHouse: false })).venusInKeyHouse).toBe(false);
    expect(buildTrueLoveView(scores({ venusInKeyHouse: undefined })).venusInKeyHouse).toBeNull();
  });

  it("degrades to nulls on an empty scores bag rather than throwing", () => {
    expect(buildTrueLoveView({})).toEqual({
      romance: null,
      partnership: null,
      tilt: null,
      venusInKeyHouse: null,
    });
  });

  it("names a lucide icon for every one of the backend's 9 section ids", () => {
    expect(Object.keys(SECTION_ICON)).toEqual([
      "what_this_means_for_you",
      "family_blessing",
      "timing_windows",
      "romantic_archetype",
      "blessings_cautions",
      "romance_by_decade",
      "naturally_drawn_to",
      "patterns_repeating",
      "blocking_you_recognize_the_one",
    ]);
  });
});
