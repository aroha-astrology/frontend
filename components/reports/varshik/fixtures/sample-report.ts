import type { ReportReady } from "@/hooks/useReport";
import type { ReportSection } from "@/lib/reports-api";
import { sampleFacts } from "../fixture";

/**
 * DEV PREVIEW ONLY. The numbers are the Sprint 3 test report's real facts; the WORDS are placeholder
 * sentences so the layouts can be checked without calling the model. Real text comes from the
 * backend (5 checked calls) and is never written here.
 */
const IDS = [
  "welcome_letter", "year_at_a_glance", "year_lord_muntha", "two_varsha_years", "big_sky_moves",
  "planet_by_planet", "doshas", "yogas",
  "area_love", "area_career", "area_money", "area_health", "area_family", "area_growth", "area_travel",
  "timing_map", "year_rhythm", "sky_calendar", "when_to_act", "golden_windows",
  ...Array.from({ length: 12 }, (_, i) => `month_${String(i + 1).padStart(2, "0")}`),
  "birth_stars", "three_flags", "your_stars_2027",
  "simple_remedies", "what_changes", "closing_letter",
];

const HEADINGS: Record<string, string> = {
  welcome_letter: "Welcome to your year",
  year_at_a_glance: "Your 2027 at a glance",
  year_lord_muntha: "Your Year Lord and Muntha",
  two_varsha_years: "Your two Varsha years",
  big_sky_moves: "The big moves of the sky",
  planet_by_planet: "Planet by planet",
  doshas: "Doshas in your 2027",
  yogas: "Yogas on your side",
  area_love: "Love and relationships",
  area_career: "Career and work",
  area_money: "Money and savings",
  area_health: "Health and energy",
  area_family: "Family and home",
  area_growth: "Growth and learning",
  area_travel: "Travel and journeys",
  timing_map: "Your Master Timing Map",
  year_rhythm: "The rhythm of your year",
  sky_calendar: "Sky calendar 2027",
  when_to_act: "When to act",
  golden_windows: "Golden windows and key dates",
  birth_stars: "Your birth stars",
  three_flags: "The year's three flags",
  your_stars_2027: "Your stars in 2027",
  simple_remedies: "Simple remedies",
  what_changes: "What you have been through, and what changes",
  closing_letter: "A closing letter from Baba Ji",
};

const SENTENCE =
  "This is placeholder text for the layout check. The real words are written from your chart and checked against it before you ever see them.";

function section(id: string): ReportSection {
  const month = /^month_(\d\d)$/.exec(id);
  return {
    id,
    heading: HEADINGS[id] ?? id,
    hook: id === "welcome_letter" || id === "closing_letter" ? "A year is a long road, and you are not walking it alone." : undefined,
    paragraphs: Array.from({ length: month ? 5 : id.startsWith("area_") ? 2 : 3 }, () => SENTENCE),
    bullets: id === "simple_remedies" ? ["Light a lamp on a Thursday evening.", "Call an elder you have not spoken to lately."] : undefined,
  };
}

export const sampleReport: ReportReady = {
  status: "ready",
  reportKey: "varshik_rashifal_2027",
  periodMonth: null,
  scores: { varshik: sampleFacts as unknown as Record<string, unknown> },
  sections: [
    ...IDS.map(section),
    {
      id: "question_1",
      heading: "Whether to change your job this year",
      paragraphs: [SENTENCE, SENTENCE, SENTENCE],
      uiData: { key: "new_work", windowFrom: "2027-09-10", windowTo: "2027-10-28", peak: "2027-10-02", tier: "dark_green", weak: false, next: { from: "2027-12-01", to: "2027-12-20" } },
    },
    {
      id: "question_2",
      heading: "Moving to a new city",
      paragraphs: [SENTENCE, SENTENCE, SENTENCE],
      uiData: { key: "move_home", windowFrom: "2027-11-05", windowTo: "2027-12-30", peak: "2027-11-20", tier: "light_green", weak: true, next: null },
    },
  ],
} as ReportReady;
