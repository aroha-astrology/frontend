import { describe, it, expect } from "vitest";
import { humanizeKey, humanizeValue, buildScoreFacts } from "./report-score-facts";

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
