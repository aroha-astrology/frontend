import { describe, expect, it } from "vitest";
import {
  buildKpAnnualView,
  monthRangeLabel,
  shortMonth,
  stripMonthPrefix,
  strongestAreas,
} from "./kp-annual-report-view";

const tones = (over: Record<string, string> = {}) => ({
  career: "quiet",
  money: "quiet",
  love: "quiet",
  health: "quiet",
  home: "quiet",
  travel: "quiet",
  learning: "quiet",
  family: "quiet",
  ...over,
});

const month = (i: number, sign = "Leo", over: Record<string, string> = {}) => ({
  index: i,
  start: `2026-${String(10 + i).padStart(2, "0")}-25`,
  end: `2026-${String(11 + i).padStart(2, "0")}-25`,
  mid: `2026-${String(11 + i).padStart(2, "0")}-09`,
  dasha: { md: "Rahu", ad: "Sun", pd: "Jupiter" },
  tones: tones(over),
  focus: "career",
  care: i === 1 ? "rest" : null,
  transits: [{ planet: "Jupiter", sign, nakshatra: "Magha", starLord: "Ketu", subLord: "Venus", natalHouse: 1 }],
});

const scores = {
  window: { start: "2026-09-25", end: "2027-09-25" },
  engine: { houseSystem: "placidus" },
  sensitiveCusps: [7],
  areas: [
    { key: "career", promise: "strong", principalCusp: 10, cuspSubLord: "Sun", peakMonths: [0], activeMonths: [1], bestWindow: { start: "2026-09-25", end: "2026-11-25", lords: ["Sun"] } },
    { key: "love", promise: "slow", principalCusp: 7, cuspSubLord: "Venus", peakMonths: [], activeMonths: [0, 1], bestWindow: null, cuspNearBoundary: true },
    { key: "money", promise: "strong", principalCusp: 11, cuspSubLord: "Ketu", peakMonths: [0, 1], activeMonths: [], bestWindow: null },
    { key: "bogus", promise: "strong" },
  ],
  months: [month(0, "Cancer", { career: "peak" }), month(1, "Leo", { love: "weird" })],
  questions: [
    { question: "Will I get a new job?", topic: "career", promise: "strong", principalCusp: 10, peakMonths: [0], activeMonths: [], bestWindow: null },
    { question: "", topic: "love" },
  ],
  cusps: [{ house: 7, sign: "Capricorn", nakshatra: "Shravana", starLord: "Moon", subLord: "Venus" }],
  rulingPlanets: [{ planet: "Venus", role: "DAY_LORD" }],
  dashaNow: { md: "Rahu", ad: "Sun", pd: "Jupiter", adEnds: "2027-05-08" },
  dashaShifts: [{ date: "2027-05-08", md: "Rahu", ad: "Moon" }],
};

const sections = [
  { id: "year_at_a_glance", heading: "Glance", paragraphs: ["x"] },
  { id: "month_by_month", heading: "Months", paragraphs: ["Oct 2026: Push for the raise.", "Nov 2026: Rest."] },
  { id: "your_questions", heading: "Q", paragraphs: ["Yes — in October."] },
];

describe("buildKpAnnualView", () => {
  const view = buildKpAnnualView(scores, sections);

  it("keeps only known areas and passes the word verdicts through", () => {
    expect(view.areas.map((a) => a.key)).toEqual(["career", "love", "money"]);
    expect(view.areas[1]).toMatchObject({ promise: "slow", sensitive: true, bestWindow: null });
  });

  it("zips the month narrative onto months with the label stripped, and sanitizes tones", () => {
    expect(view.months[0]!.note).toBe("Push for the raise.");
    expect(view.months[0]!.tones.career).toBe("peak");
    expect(view.months[1]!.tones.love).toBe("quiet");
    expect(view.months[1]!.care).toBe("rest");
  });

  it("pairs answers with questions and drops blank questions", () => {
    expect(view.questions).toHaveLength(1);
    expect(view.questions[0]).toMatchObject({ topic: "career", answer: "Yes — in October." });
  });

  it("keeps month notes and answers out of the accordion", () => {
    expect(view.narrative.map((s) => s.id)).toEqual(["year_at_a_glance"]);
  });

  it("detects slow-planet sign changes and flags sensitive cusps", () => {
    expect(view.transitChanges).toEqual([{ planet: "Jupiter", monthIndex: 1, fromSign: "Cancer", toSign: "Leo" }]);
    expect(view.cusps[0]!.sensitive).toBe(true);
    expect(view.dashaShifts).toHaveLength(1);
  });

  it("never throws on an empty or malformed report", () => {
    const empty = buildKpAnnualView({}, []);
    expect(empty).toMatchObject({ areas: [], months: [], questions: [], dashaNow: null, window: null });
    expect(() => buildKpAnnualView({ areas: "x", months: [null], questions: 3 }, [])).not.toThrow();
  });

  it("never exposes a numeric score", () => {
    expect(JSON.stringify(view)).not.toMatch(/"score"/);
  });
});

describe("helpers", () => {
  it("ranks strongest areas by promise, then peak months", () => {
    const view = buildKpAnnualView(scores, sections);
    expect(strongestAreas(view.areas, 2).map((a) => a.key)).toEqual(["money", "career"]);
  });

  it("formats month labels", () => {
    expect(shortMonth("2026-10-09")).toMatch(/Oct/);
    expect(monthRangeLabel("2026-09-25", "2026-10-25")).toMatch(/25 Sept?.*24 Oct/);
    expect(stripMonthPrefix("Oct 2026: Do it.")).toBe("Do it.");
    expect(stripMonthPrefix("Plain sentence with no label.")).toBe("Plain sentence with no label.");
  });
});
