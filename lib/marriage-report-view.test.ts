import { describe, it, expect } from "vitest";
import {
  buildMarriageView,
  toBand,
  strengthTone,
  isStrength,
  HIGHLIGHT_KEYS,
  SECTION_ICON,
  isDecadeExplanationArray,
} from "./marriage-report-view";

/** A representative marriage `scores` bag, shaped exactly as the API returns it. */
function scores(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    marriageScore: 70,
    band: "steady",
    seventhLord: "Venus",
    seventhLordStrength: "strong",
    seventhLordReason: "Exalted in Pisces",
    venusStrength: "strong",
    venusReason: "Own sign",
    jupiterStrength: "average",
    jupiterReason: "Combust",
    seventhHouseSign: "Libra",
    seventhHouseTemperament: "Harmonious and partnership-seeking",
    fourthLordStrength: "weak",
    ageBands: [
      { label: "Late twenties", startAge: 27, endAge: 30, confidence: "HIGH" },
      { label: "Early thirties", startAge: 31, endAge: 35, confidence: "LOW" },
    ],
    windows: [
      {
        startDate: "2026-05-01",
        endDate: "2027-12-31",
        score: 82,
        level: "HIGH",
        dashaLevel: "antardasha",
        reasoning: ["Jupiter transits the 7th"],
        summary: "A strong stretch for commitment.",
      },
      {
        startDate: "2029-01-01",
        endDate: "2029-08-01",
        score: 51,
        level: "MEDIUM",
        dashaLevel: "pratyantardasha",
        reasoning: [],
      },
    ],
    partnerArchetype: {
      label: "The Steady Anchor",
      description: "Grounded, loyal, slow to anger.",
      traits: [{ label: "Warmth", score: 7 }],
    },
    ...overrides,
  };
}

describe("toBand", () => {
  it("uses the mock's score-badge thresholds", () => {
    expect(toBand(95)).toBe("excellent");
    expect(toBand(90)).toBe("excellent");
    expect(toBand(89)).toBe("good");
    expect(toBand(70)).toBe("good");
    expect(toBand(69)).toBe("average");
    expect(toBand(30)).toBe("average");
  });

  it("returns null rather than a fake band when there is no score", () => {
    expect(toBand(null)).toBeNull();
  });
});

describe("strengthTone", () => {
  it("treats average as neither a plus nor a caution", () => {
    expect(strengthTone("strong")).toBe("positive");
    expect(strengthTone("weak")).toBe("caution");
    expect(strengthTone("average")).toBe("neutral");
    expect(strengthTone(null)).toBe("neutral");
  });
});

describe("isStrength", () => {
  it("accepts only the engine's three values", () => {
    expect(isStrength("strong")).toBe(true);
    expect(isStrength("average")).toBe(true);
    expect(isStrength("weak")).toBe(true);
    // The 5-step vocabulary from the visual mock is deliberately not a thing here.
    expect(isStrength("Very Good")).toBe(false);
    expect(isStrength(undefined)).toBe(false);
    expect(isStrength(3)).toBe(false);
  });
});

describe("buildMarriageView", () => {
  it("maps the headline score and band", () => {
    const v = buildMarriageView(scores());
    expect(v.score).toBe(70);
    expect(v.band).toBe("good");
  });

  it("emits all five highlight tiles, in mock order", () => {
    const v = buildMarriageView(scores());
    expect(v.highlights.map((h) => h.key)).toEqual([...HIGHLIGHT_KEYS]);
  });

  it("fills each tile from its own score, as either a strength or display text", () => {
    const byKey = Object.fromEntries(buildMarriageView(scores()).highlights.map((h) => [h.key, h]));
    expect(byKey.potential.strength).toBe("strong"); // marriageScore 70
    expect(byKey.compatibility.strength).toBe("strong"); // venusStrength
    expect(byKey.stability.strength).toBe("strong"); // seventhLordStrength
    expect(byKey.timing.text).toBe("27-30"); // first confident age band
    expect(byKey.spouse.text).toBe("The Steady Anchor");
  });

  it("never sets both strength and text on the same tile", () => {
    for (const tile of buildMarriageView(scores()).highlights) {
      expect(tile.strength === null || tile.text === null).toBe(true);
    }
  });

  it("skips age bands with no confidence when picking the timing tile", () => {
    const v = buildMarriageView(
      scores({
        ageBands: [
          { label: "Unclear", startAge: 20, endAge: 26, confidence: "NONE" },
          { label: "Thirties", startAge: 31, endAge: 35, confidence: "MEDIUM" },
        ],
      }),
    );
    expect(v.highlights.find((h) => h.key === "timing")?.text).toBe("31-35");
  });

  it("formats an open-ended age band as N+", () => {
    const v = buildMarriageView(
      scores({ ageBands: [{ label: "Later", startAge: 36, endAge: null, confidence: "HIGH" }] }),
    );
    expect(v.highlights.find((h) => h.key === "timing")?.text).toBe("36+");
  });

  it("counts positives and cautions across the tiles", () => {
    const v = buildMarriageView(scores());
    // potential/compatibility/stability strong + timing present = 4 positive, 0 caution
    expect(v.positiveCount).toBe(4);
    expect(v.cautionCount).toBe(0);

    const weak = buildMarriageView(
      scores({ marriageScore: 30, venusStrength: "weak", seventhLordStrength: "average" }),
    );
    expect(weak.cautionCount).toBe(2); // potential + compatibility
    expect(weak.positiveCount).toBe(1); // timing only
  });

  it("takes the highest-ranked window, which the backend returns first", () => {
    const v = buildMarriageView(scores());
    expect(v.window?.startDate).toBe("2026-05-01");
    expect(v.window?.level).toBe("HIGH");
  });

  it("builds Venus, Jupiter and the 7th lord, each with its reason", () => {
    const v = buildMarriageView(scores());
    expect(v.planets.map((p) => p.role)).toEqual(["venus", "jupiter", "seventhLord"]);
    expect(v.planets[1]).toMatchObject({ planet: "jupiter", strength: "average", reason: "Combust" });
  });

  it("lowercases the 7th lord so it resolves to a /planets/<name>.png asset", () => {
    const v = buildMarriageView(scores({ seventhLord: "Saturn" }));
    expect(v.planets.find((p) => p.role === "seventhLord")?.planet).toBe("saturn");
  });

  it("drops the 7th-lord row when the chart does not name that planet", () => {
    const v = buildMarriageView(scores({ seventhLord: undefined }));
    expect(v.planets.map((p) => p.role)).toEqual(["venus", "jupiter"]);
  });

  it("keeps Venus twice when Venus is also the 7th lord — that is a real astrological fact, not a duplicate", () => {
    const v = buildMarriageView(scores());
    expect(v.planets.filter((p) => p.planet === "venus")).toHaveLength(2);
  });

  it("maps the 7th house facts", () => {
    expect(buildMarriageView(scores()).seventhHouse).toEqual({
      sign: "Libra",
      lord: "Venus",
      strength: "strong",
      temperament: "Harmonious and partnership-seeking",
    });
  });

  // An older report predates some scoring fields, and the backend recomputes scores on
  // every read — so any field can legitimately be absent. Nothing here may throw.
  it("degrades to nulls on a completely empty scores bag", () => {
    for (const empty of [{}, null, undefined]) {
      const v = buildMarriageView(empty);
      expect(v.score).toBeNull();
      expect(v.band).toBeNull();
      expect(v.window).toBeNull();
      expect(v.archetype).toBeNull();
      expect(v.positiveCount).toBe(0);
      expect(v.cautionCount).toBe(0);
      expect(v.highlights).toHaveLength(HIGHLIGHT_KEYS.length);
      expect(v.highlights.every((h) => h.strength === null && h.text === null)).toBe(true);
      expect(v.seventhHouse.sign).toBeNull();
    }
  });

  it("ignores malformed values instead of passing them through to the UI", () => {
    const v = buildMarriageView(
      scores({
        marriageScore: "seventy",
        venusStrength: "Very Good",
        windows: "soon",
        ageBands: {},
        partnerArchetype: { label: "no traits array" },
        seventhHouseSign: "   ",
      }),
    );
    expect(v.score).toBeNull();
    expect(v.window).toBeNull();
    expect(v.archetype).toBeNull();
    expect(v.seventhHouse.sign).toBeNull();
    expect(v.highlights.find((h) => h.key === "compatibility")?.strength).toBeNull();
    expect(v.highlights.find((h) => h.key === "timing")?.text).toBeNull();
  });
});

describe("SECTION_ICON", () => {
  it("covers all eight canonical marriage section ids", () => {
    expect(Object.keys(SECTION_ICON).sort()).toEqual(
      [
        "at_a_glance",
        "family_in_laws",
        "going_for_you_and_hold_carefully",
        "marriage_quality_by_decade",
        "marriage_timing",
        "modern_realities",
        "money_after_marriage",
        "who_you_will_marry",
      ].sort(),
    );
  });
});

describe("isDecadeExplanationArray", () => {
  it("accepts a well-formed model response", () => {
    expect(
      isDecadeExplanationArray([{ label: "Years 1-10", explanation: "Jupiter's period." }]),
    ).toBe(true);
    expect(isDecadeExplanationArray([])).toBe(true);
  });

  it("rejects every shape the model actually gets wrong", () => {
    expect(isDecadeExplanationArray(undefined)).toBe(false);
    expect(isDecadeExplanationArray("Years 1-10: good")).toBe(false);
    expect(isDecadeExplanationArray({ "Years 1-10": "good" })).toBe(false);
    expect(isDecadeExplanationArray([{ label: "Years 1-10" }])).toBe(false);
    expect(isDecadeExplanationArray([{ label: 1, explanation: "x" }])).toBe(false);
    expect(isDecadeExplanationArray([null])).toBe(false);
  });

  it("pairs explanations by label, falling back to position when the model reformats it", () => {
    // The exact failure this fallback exists for: the model answers "1-10" for a band the
    // engine labelled "Years 1-10", which an exact-match-only lookup drops silently.
    const bands = [{ label: "Years 1-10" }, { label: "Years 11-20" }];
    const explanations = [
      { label: "1-10", explanation: "first" },
      { label: "Years 11-20", explanation: "second" },
    ];
    const paired = bands.map(
      (b, i) => (explanations.find((e) => e.label === b.label) ?? explanations[i])?.explanation,
    );
    expect(paired).toEqual(["first", "second"]);
  });
});
