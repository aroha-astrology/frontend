import { describe, it, expect } from "vitest";
import {
  humanizeKey,
  humanizeValue,
  buildScoreFact,
  buildScoreFacts,
  isRankedWindowArray,
  isAgeBandArray,
  isDecadeBandArray,
  isArchetype,
  isDoshaYogaSummary,
  isKootaBreakdownArray,
  isGemstoneArray,
  isLifeContext,
  isReportHeader,
  isReportVerdict,
  type RankedWindow,
  type AgeBand,
  type DecadeBand,
  type Archetype,
  type DoshaYogaSummary,
  type KootaEntry,
  type ReportGemstone,
  type LifeContextValue,
  type ReportHeaderValue,
  type ReportVerdictValue,
} from "./report-score-facts";

describe("humanizeKey", () => {
  it("splits camelCase into title-cased words", () => {
    expect(humanizeKey("marriageScore")).toBe("Marriage Score");
  });

  it("splits snake_case into title-cased words", () => {
    expect(humanizeKey("moon_nakshatra")).toBe("Moon Nakshatra");
  });

  it("leaves an already-single-word key capitalized", () => {
    expect(humanizeKey("band")).toBe("Band");
  });

  it("handles a run of consecutive capitals sensibly (acronym-ish key)", () => {
    expect(humanizeKey("gunaMilanScore")).toBe("Guna Milan Score");
  });
});

describe("humanizeValue", () => {
  it("title-cases a snake_case enum value", () => {
    expect(humanizeValue("steady")).toBe("Steady");
  });

  it("title-cases a camelCase enum value", () => {
    expect(humanizeValue("veryGood")).toBe("Very Good");
  });
});

describe("buildScoreFacts", () => {
  it("returns an empty array for null/undefined/non-object input without crashing", () => {
    expect(buildScoreFacts(null)).toEqual([]);
    expect(buildScoreFacts(undefined)).toEqual([]);
    expect(buildScoreFacts("not an object" as unknown as Record<string, unknown>)).toEqual([]);
  });

  it("renders a plain 0-100 number as a ring fact with max 100", () => {
    const facts = buildScoreFacts({ marriageScore: 78 });
    expect(facts).toEqual([
      { key: "marriageScore", label: "Marriage Score", type: "ring", value: 78, max: 100, pct: 78 },
    ]);
  });

  it("uses max 36 for a guna/koota/milan-named score", () => {
    const facts = buildScoreFacts({ gunaMilanScore: 27 });
    expect(facts[0]).toMatchObject({ type: "ring", max: 36, value: 27, pct: 75 });
  });

  it("renders a short string enum as a badge with humanized value", () => {
    const facts = buildScoreFacts({ band: "steady" });
    expect(facts).toEqual([{ key: "band", label: "Band", type: "badge", value: "Steady" }]);
  });

  it("renders a boolean as a boolean fact", () => {
    const facts = buildScoreFacts({ isManglik: true });
    expect(facts).toEqual([{ key: "isManglik", label: "Is Manglik", type: "boolean", value: true }]);
  });

  it("renders a nested object as a nested fact with humanized entry labels", () => {
    const facts = buildScoreFacts({ manglik: { isManglik: false, cancelled: true } });
    expect(facts).toHaveLength(1);
    expect(facts[0].type).toBe("nested");
    if (facts[0].type === "nested") {
      expect(facts[0].label).toBe("Manglik");
      expect(facts[0].entries.map((e) => e.label)).toEqual(["Is Manglik", "Cancelled"]);
    }
  });

  it("renders an array as a nested fact rather than skipping it", () => {
    const facts = buildScoreFacts({ upcomingWindows: ["2026-08-01", "2026-09-14"] });
    expect(facts).toHaveLength(1);
    expect(facts[0].type).toBe("nested");
  });

  it("classifies a top-level prose sentence as 'raw' with untouched casing, not a title-cased 'badge'", () => {
    const facts = buildScoreFacts({
      seventhHouseTemperament: "steady, sensual, and loyal once trust is earned",
      band: "steady",
    });
    expect(facts).toEqual([
      { key: "seventhHouseTemperament", label: "Seventh House Temperament", type: "raw", value: "steady, sensual, and loyal once trust is earned" },
      { key: "band", label: "Band", type: "badge", value: "Steady" },
    ]);
  });

  it("marks a long sentence value as prose and leaves its casing untouched, unlike a short enum value", () => {
    const facts = buildScoreFacts({
      inLaws: {
        fourthHouseSign: "Aquarius",
        note: "The 4th house (home and family) falls in Aquarius, and its lord is classically average.",
      },
    });
    expect(facts[0].type).toBe("nested");
    if (facts[0].type !== "nested") return;
    const [signEntry, noteEntry] = facts[0].entries;
    expect(signEntry).toEqual({ label: "Fourth House Sign", display: "Aquarius" });
    expect(noteEntry.prose).toBe(true);
    expect(noteEntry.display).toBe(
      "The 4th house (home and family) falls in Aquarius, and its lord is classically average.",
    );
  });

  it("does not crash on an out-of-range number and falls back to a raw fact", () => {
    const facts = buildScoreFacts({ weirdScore: 500 });
    expect(facts).toEqual([{ key: "weirdScore", label: "Weird Score", type: "raw", value: "500" }]);
  });

  it("skips null/undefined/empty-string values rather than rendering an empty fact", () => {
    const facts = buildScoreFacts({ a: null, b: undefined, c: "" });
    expect(facts).toEqual([]);
  });

  it("handles a mixed real-world shape (marriage report) without crashing", () => {
    const facts = buildScoreFacts({
      marriageScore: 82,
      band: "strong",
      manglik: { isManglik: true, cancelled: true },
      timingWindows: ["2027-01", "2027-06"],
    });
    expect(facts).toHaveLength(4);
    expect(facts.map((f) => f.key)).toEqual(["marriageScore", "band", "manglik", "timingWindows"]);
  });

  it("preserves the original scores object's key order", () => {
    const facts = buildScoreFacts({ z: "one", a: "two" });
    expect(facts.map((f) => f.key)).toEqual(["z", "a"]);
  });
});

// ─── Bespoke report-enrichment shapes ───────────────────────────────────────
// These 5 shapes are detected by VALUE shape, never by key name, since the
// backend uses a different field name per report type for the same concept
// (e.g. archetype is `partnerArchetype` on marriage, `moneyArchetype` on
// wealth, `workArchetype` on career_monthly, plain `archetype` on true_love).

const sampleWindow: RankedWindow = {
  startDate: "2026-08-01",
  endDate: "2026-09-14",
  score: 82,
  level: "HIGH",
  dashaLevel: "antardasha",
  reasoning: ["Jupiter transits the 7th house", "Venus antardasha is active"],
};

const sampleAgeBand: AgeBand = {
  label: "Now – 32",
  startAge: 28,
  endAge: 32,
  confidence: "HIGH",
};

const sampleArchetype: Archetype = {
  label: "Partnership Archetype",
  description: "A steady, loyalty-driven partner who values long-term commitment.",
  traits: [
    { label: "Loyalty", score: 9 },
    { label: "Communication", score: 6 },
    { label: "Passion", score: 7 },
    { label: "Independence", score: 4 },
    { label: "Stability", score: 8 },
  ],
};

const sampleDecadeBand: DecadeBand = {
  label: "Years 1-10",
  startDate: "2026-01-01",
  endDate: "2036-01-01",
  score: 74,
  tone: "favorable",
};

const sampleDoshaYoga: DoshaYogaSummary = {
  positives: [{ label: "Gaja Kesari Yoga", detail: "Jupiter and Moon in mutual kendras." }],
  cautions: [{ label: "Mangal Dosha", detail: "Mars in the 7th house from Lagna." }],
};

describe("isRankedWindowArray / timingWindows classification", () => {
  it("classifies a RankedWindow[] as a timingWindows fact regardless of field name", () => {
    expect(isRankedWindowArray([sampleWindow])).toBe(true);

    const facts = buildScoreFacts({ windows: [sampleWindow] });
    expect(facts).toEqual([
      { key: "windows", label: "Windows", type: "timingWindows", windows: [sampleWindow] },
    ]);
  });

  it("does not misclassify an AgeBand[] or a DecadeBand[]", () => {
    expect(isRankedWindowArray([sampleAgeBand])).toBe(false);
    expect(isRankedWindowArray([sampleDecadeBand])).toBe(false);
  });

  it("does not misclassify a generic unrelated string array", () => {
    expect(isRankedWindowArray(["Mars", "Rahu"])).toBe(false);
  });
});

describe("isAgeBandArray / ageBands classification", () => {
  it("classifies an AgeBand[] as an ageBands fact", () => {
    expect(isAgeBandArray([sampleAgeBand])).toBe(true);

    const facts = buildScoreFacts({ ageBands: [sampleAgeBand] });
    expect(facts).toEqual([{ key: "ageBands", label: "Age Bands", type: "ageBands", bands: [sampleAgeBand] }]);
  });

  it("does not misclassify a RankedWindow[] or a DecadeBand[]", () => {
    expect(isAgeBandArray([sampleWindow])).toBe(false);
    expect(isAgeBandArray([sampleDecadeBand])).toBe(false);
  });

  it("does not misclassify a generic unrelated string array", () => {
    expect(isAgeBandArray(["Aa", "Ii", "Ee"])).toBe(false);
  });
});

describe("isDecadeBandArray / decadeArc classification", () => {
  it("classifies a DecadeBand[] as a decadeArc fact under a report-specific field name", () => {
    expect(isDecadeBandArray([sampleDecadeBand])).toBe(true);

    const facts = buildScoreFacts({ marriageQualityArc: [sampleDecadeBand] });
    expect(facts).toEqual([
      { key: "marriageQualityArc", label: "Marriage Quality Arc", type: "decadeArc", bands: [sampleDecadeBand] },
    ]);
  });

  it("does not misclassify a RankedWindow[] or an AgeBand[]", () => {
    expect(isDecadeBandArray([sampleWindow])).toBe(false);
    expect(isDecadeBandArray([sampleAgeBand])).toBe(false);
  });

  it("does not misclassify a generic unrelated string array", () => {
    expect(isDecadeBandArray(["Mars", "Rahu", "Ketu"])).toBe(false);
  });
});

describe("cross-matching guard across all 3 array shapes + generic arrays", () => {
  it("each of the 3 array-shaped detectors matches only its own shape", () => {
    const shapes: { windows: unknown; ageBands: unknown; decade: unknown } = {
      windows: [sampleWindow],
      ageBands: [sampleAgeBand],
      decade: [sampleDecadeBand],
    };
    expect(isRankedWindowArray(shapes.windows)).toBe(true);
    expect(isRankedWindowArray(shapes.ageBands)).toBe(false);
    expect(isRankedWindowArray(shapes.decade)).toBe(false);

    expect(isAgeBandArray(shapes.ageBands)).toBe(true);
    expect(isAgeBandArray(shapes.windows)).toBe(false);
    expect(isAgeBandArray(shapes.decade)).toBe(false);

    expect(isDecadeBandArray(shapes.decade)).toBe(true);
    expect(isDecadeBandArray(shapes.windows)).toBe(false);
    expect(isDecadeBandArray(shapes.ageBands)).toBe(false);
  });

  it("none of the 3 detectors misclassify past_life's conjunctPlanets: string[]", () => {
    const conjunctPlanets = ["Mars", "Rahu", "Ketu"];
    expect(isRankedWindowArray(conjunctPlanets)).toBe(false);
    expect(isAgeBandArray(conjunctPlanets)).toBe(false);
    expect(isDecadeBandArray(conjunctPlanets)).toBe(false);

    const facts = buildScoreFacts({ conjunctPlanets });
    expect(facts).toEqual([{ key: "conjunctPlanets", label: "Conjunct Planets", type: "nested", entries: [
      { label: "1", display: "Mars" },
      { label: "2", display: "Rahu" },
      { label: "3", display: "Ketu" },
    ] }]);
  });

  it("none of the 3 detectors misclassify baby_name's startingSyllables: string[]", () => {
    const startingSyllables = ["Aa", "Ii", "Ee"];
    expect(isRankedWindowArray(startingSyllables)).toBe(false);
    expect(isAgeBandArray(startingSyllables)).toBe(false);
    expect(isDecadeBandArray(startingSyllables)).toBe(false);

    const facts = buildScoreFacts({ startingSyllables });
    expect(facts[0].type).toBe("nested");
  });
});

describe("isArchetype / archetype classification", () => {
  it("classifies an Archetype object as an archetype fact under ANY field name", () => {
    expect(isArchetype(sampleArchetype)).toBe(true);

    for (const fieldName of ["partnerArchetype", "moneyArchetype", "workArchetype", "archetype"]) {
      const facts = buildScoreFacts({ [fieldName]: sampleArchetype });
      expect(facts).toHaveLength(1);
      expect(facts[0].type).toBe("archetype");
      if (facts[0].type === "archetype") {
        expect(facts[0].archetype).toEqual(sampleArchetype);
      }
    }
  });

  it("does not misclassify a plain nested object without traits", () => {
    expect(isArchetype({ isManglik: false, cancelled: true })).toBe(false);
  });
});

describe("isDoshaYogaSummary / doshaYoga classification", () => {
  it("classifies a DoshaYogaSummary object as a doshaYoga fact under both known field names", () => {
    expect(isDoshaYogaSummary(sampleDoshaYoga)).toBe(true);

    for (const fieldName of ["doshaYoga", "primaryDoshaYoga"]) {
      const facts = buildScoreFacts({ [fieldName]: sampleDoshaYoga });
      expect(facts).toHaveLength(1);
      expect(facts[0].type).toBe("doshaYoga");
      if (facts[0].type === "doshaYoga") {
        expect(facts[0].summary).toEqual(sampleDoshaYoga);
      }
    }
  });

  it("classifies correctly even when positives or cautions is an empty array (a valid 'nothing found' result)", () => {
    const empty: DoshaYogaSummary = { positives: [], cautions: [] };
    expect(isDoshaYogaSummary(empty)).toBe(true);
    const facts = buildScoreFacts({ doshaYoga: empty });
    expect(facts).toEqual([{ key: "doshaYoga", label: "Dosha Yoga", type: "doshaYoga", summary: empty }]);
  });

  it("does not misclassify a plain nested object without positives/cautions", () => {
    expect(isDoshaYogaSummary({ isManglik: false, cancelled: true })).toBe(false);
  });
});

describe("isKootaBreakdownArray / kootaBreakdown classification", () => {
  const sampleKootaBreakdown: KootaEntry[] = [
    { name: "Varna", score: 1, maxScore: 1, description: "Matched" },
    { name: "Nadi", score: 0, maxScore: 8, description: "Same Nadi — a red flag" },
  ];

  it("classifies a KootaEntry[] as a kootaBreakdown fact under both known field names", () => {
    expect(isKootaBreakdownArray(sampleKootaBreakdown)).toBe(true);

    for (const fieldName of ["gunaBreakdown", "dashakootaBreakdown"]) {
      const facts = buildScoreFacts({ [fieldName]: sampleKootaBreakdown });
      expect(facts).toHaveLength(1);
      expect(facts[0].type).toBe("kootaBreakdown");
      if (facts[0].type === "kootaBreakdown") {
        expect(facts[0].entries).toEqual(sampleKootaBreakdown);
      }
    }
  });

  it("is not misclassified by, and does not misclassify, the other 3 array shapes", () => {
    expect(isRankedWindowArray(sampleKootaBreakdown)).toBe(false);
    expect(isAgeBandArray(sampleKootaBreakdown)).toBe(false);
    expect(isDecadeBandArray(sampleKootaBreakdown)).toBe(false);

    expect(isKootaBreakdownArray([sampleWindow])).toBe(false);
    expect(isKootaBreakdownArray([sampleAgeBand])).toBe(false);
    expect(isKootaBreakdownArray([sampleDecadeBand])).toBe(false);
  });

  it("does not misclassify a plain string array", () => {
    expect(isKootaBreakdownArray(["Aa", "Ii", "Ee"])).toBe(false);
  });
});

describe("no regression on pre-existing generic classification", () => {
  it("a plain nested object still classifies as 'nested', not as one of the 5 new types", () => {
    const facts = buildScoreFacts({ manglik: { isManglik: true, cancelled: true } });
    expect(facts[0].type).toBe("nested");
  });

  it("a plain string array still classifies as 'nested', not as one of the 5 new types", () => {
    const facts = buildScoreFacts({ upcomingWindows: ["2026-08-01", "2026-09-14"] });
    expect(facts[0].type).toBe("nested");
  });

  it("a plain number still classifies as 'ring'", () => {
    const facts = buildScoreFacts({ marriageScore: 78 });
    expect(facts[0].type).toBe("ring");
  });

  it("a boolean still classifies as 'boolean'", () => {
    const facts = buildScoreFacts({ isManglik: true });
    expect(facts[0].type).toBe("boolean");
  });
});

describe("isGemstoneArray / gemstones classification", () => {
  const sampleGemstones: ReportGemstone[] = [
    {
      planet: "Venus",
      role: "Venus classically governs romantic harmony.",
      benefit: "Supports a warmer marriage bond.",
      strength: "strong",
      reason: "Exalted in Pisces",
      preference: 20,
      color: "#a78bfa",
      conditionalCautionApplies: false,
    },
  ];

  it("classifies a ReportGemstone[] as a gemstones fact", () => {
    expect(isGemstoneArray(sampleGemstones)).toBe(true);
    const facts = buildScoreFacts({ gemstones: sampleGemstones });
    expect(facts).toHaveLength(1);
    expect(facts[0].type).toBe("gemstones");
  });

  it("is not misclassified by, and does not misclassify, the other array shapes", () => {
    expect(isRankedWindowArray(sampleGemstones)).toBe(false);
    expect(isKootaBreakdownArray(sampleGemstones)).toBe(false);
    expect(isGemstoneArray([{ name: "Varna", score: 1, maxScore: 1, description: "Matched" }])).toBe(
      false,
    );
  });

  it("rejects an empty array (falls through to the generic empty-array handling)", () => {
    expect(isGemstoneArray([])).toBe(false);
  });
});

describe("isLifeContext classification", () => {
  const sampleLifeContext: LifeContextValue = {
    currentMahadasha: "Saturn",
    currentAntardasha: "Moon",
    endsOn: "2033-11-01",
    domains: [
      { domain: "career", score: 30, tone: "challenging", connectedHouses: [10], nextWindow: null },
    ],
  };

  it("classifies a LifeContextValue object as a lifeContext fact", () => {
    expect(isLifeContext(sampleLifeContext)).toBe(true);
    const facts = buildScoreFacts({ lifeContext: sampleLifeContext });
    expect(facts).toHaveLength(1);
    expect(facts[0].type).toBe("lifeContext");
  });

  it("is not misclassified as an archetype or doshaYoga (both plain objects too)", () => {
    expect(isArchetype(sampleLifeContext)).toBe(false);
    expect(isDoshaYogaSummary(sampleLifeContext)).toBe(false);
  });
});

describe("header/verdict are excluded from the generic facts grid", () => {
  const sampleHeader: ReportHeaderValue = {
    name: "Subir",
    dob: "1993-04-17",
    lagnaSign: "Scorpio",
    moonSign: "Aquarius",
    moonNakshatra: "Shatabhisha",
    currentMahadasha: "Saturn",
    currentAntardasha: "Moon",
    dashaEndsOn: "2033-11-01",
  };
  const sampleVerdict: ReportVerdictValue = {
    headline: "Your love is coming soon.",
    bullets: ["a", "b", "c"],
    nextStep: "Start a daily practice.",
  };

  it("isReportHeader/isReportVerdict correctly identify their own shapes", () => {
    expect(isReportHeader(sampleHeader)).toBe(true);
    expect(isReportVerdict(sampleVerdict)).toBe(true);
    // header and lifeContext both carry currentMahadasha/currentAntardasha — must not cross-match.
    expect(isLifeContext(sampleHeader)).toBe(false);
    expect(isReportHeader({ currentMahadasha: "Saturn", currentAntardasha: "Moon", domains: [] })).toBe(
      false,
    );
  });

  it("buildScoreFacts never renders header or verdict — they're rendered separately by the page", () => {
    const facts = buildScoreFacts({ header: sampleHeader, verdict: sampleVerdict, marriageScore: 64 });
    expect(facts).toHaveLength(1);
    expect(facts[0].key).toBe("marriageScore");
  });

  it("buildScoreFacts never renders currentName or variants — name_change now renders both via NameSuggestionCard", () => {
    const facts = buildScoreFacts({
      currentName: "Priya Sharma",
      variants: [{ variant: "Priya Sharmaa", chaldean: 6, change: 'added "a" at the end' }],
      dob: "1990-05-15",
    });
    expect(facts.map((f) => f.key)).toEqual(["dob"]);
  });

  // vargas/partnerVargas/ashtakavargaSummary are backend narrative-prompt grounding (see the
  // SEPARATELY_RENDERED_KEYS doc comment). They arrive on EVERY report read, since `scores` is
  // recomputed per-request rather than persisted — so without this exclusion the facts grid would
  // show a raw divisional-chart object dump and an untranslated English bindu sentence.
  it("buildScoreFacts never renders vargas/partnerVargas/ashtakavargaSummary — prompt grounding, not user-facing facts", () => {
    const facts = buildScoreFacts({
      vargas: [{ key: "D9", lagna: "Leo", planets: { Sun: "Leo", Moon: "Aries" } }],
      partnerVargas: [{ key: "D9", lagna: "Virgo", planets: { Sun: "Virgo" } }],
      ashtakavargaSummary: [
        "Ashtakavarga (raw Sarvashtakavarga bindu count per house): H1:28, H2:31. Structurally weak (<25 bindus): House 3.",
      ],
      marriageScore: 64,
    });
    expect(facts.map((f) => f.key)).toEqual(["marriageScore"]);
  });
});

describe("a plain YYYY-MM-DD date string (e.g. name_change's dob) is date-formatted, not word-split", () => {
  it("does not mangle the date into space-separated digits", () => {
    const fact = buildScoreFact("dob", "1990-05-15");
    expect(fact?.type).toBe("badge");
    expect((fact as { value: string }).value).not.toBe("1990 05 15");
    expect((fact as { value: string }).value).toContain("1990");
  });

  it("still falls back to word-splitting for a non-date string with hyphens", () => {
    const fact = buildScoreFact("someKey", "very-good-match");
    expect((fact as { value: string }).value).toBe("Very Good Match");
  });
});
