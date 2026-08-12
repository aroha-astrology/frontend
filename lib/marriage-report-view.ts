/**
 * Marriage Report view-model — turns the untyped `scores` bag the API returns
 * into the handful of shapes the bespoke marriage screen renders.
 *
 * `scores` is deliberately `Record<string, unknown>` end to end (see
 * lib/reports-api.ts) because its shape differs per report type and the backend
 * recomputes it fresh on every read, so every field is read defensively here
 * rather than cast. A marriage report generated before a given scoring field
 * shipped simply omits it, and each mapper degrades to null/[] instead of
 * throwing — same fail-open philosophy as buildScoreFacts in
 * lib/report-score-facts.ts.
 *
 * Deliberately free of React, i18n and Tailwind class strings:
 *   - no `t()` — callers pass the returned semantic tokens through their own
 *     useTranslation, matching the rule stated in components/reports/blocks/index.ts.
 *   - no class literals — Tailwind's JIT does not scan lib/ (see the top-of-file
 *     comment in lib/report-theme.ts), so a class named only here would compile
 *     to nothing. The token -> class tables live in components/reports/marriage/.
 * That also keeps this file trivially unit-testable with plain vitest, like
 * lib/reports-logic.ts and lib/report-chart-geometry.ts.
 */
import {
  isAgeBandArray,
  isArchetype,
  isRankedWindowArray,
  type AgeBand,
  type Archetype,
  type RankedWindow,
} from "./report-score-facts";
import { formatAgeRange } from "./report-chart-geometry";

/**
 * The engine's only strength vocabulary (jyotish-backend's astro-engine/gemstones.ts).
 * Deliberately NOT widened into the 5-step "Very Good / Normal / Favourable" scale the
 * visual mock shows: three underlying values dressed up as five labels would imply a
 * precision the scoring does not have, and two identically-scored charts could surface
 * different-sounding words.
 */
export type Strength = "weak" | "average" | "strong";

/** Score bands, thresholds taken from the mock's own score badges (90-100 / 70-89 / 50-69). */
export type OutlookBand = "excellent" | "good" | "average";

/** Whether a highlight tile reads as a plus, a watch-out, or neither. Drives both the tile's
 * pill color and the "N positive - N caution" counter beside the section heading. */
export type Tone = "positive" | "caution" | "neutral";

export const HIGHLIGHT_KEYS = ["potential", "compatibility", "timing", "spouse", "stability"] as const;
export type HighlightKey = (typeof HIGHLIGHT_KEYS)[number];

export interface HighlightTile {
  key: HighlightKey;
  /** Set when the tile's value IS a strength, so the caller renders a colored pill. */
  strength: Strength | null;
  /** Set when the tile's value is free text already fit to display (an age range, an
   * archetype name). Exactly one of `strength`/`text` is non-null; both null means the
   * underlying score was missing and the caller renders a dash. */
  text: string | null;
  tone: Tone;
}

export interface PlanetImpact {
  /** Lowercase planet name — also the basename of its /planets/<name>.png asset. */
  planet: string;
  /** Which marriage factor this planet stands for; an i18n key suffix, not display text. */
  role: "venus" | "jupiter" | "seventhLord";
  strength: Strength | null;
  reason: string | null;
}

export interface SeventhHouseFacts {
  sign: string | null;
  lord: string | null;
  strength: Strength | null;
  temperament: string | null;
}

export interface MarriageView {
  score: number | null;
  band: OutlookBand | null;
  highlights: HighlightTile[];
  positiveCount: number;
  cautionCount: number;
  planets: PlanetImpact[];
  /** Highest-ranked marriage window; `windows` arrives pre-sorted from the backend. */
  window: RankedWindow | null;
  seventhHouse: SeventhHouseFacts;
  archetype: Archetype | null;
}

// ── defensive readers ────────────────────────────────────────────────────────

type Scores = Record<string, unknown> | null | undefined;

function str(scores: Scores, key: string): string | null {
  const v = scores?.[key];
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function num(scores: Scores, key: string): number | null {
  const v = scores?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function isStrength(v: unknown): v is Strength {
  return v === "weak" || v === "average" || v === "strong";
}

function strength(scores: Scores, key: string): Strength | null {
  const v = scores?.[key];
  return isStrength(v) ? v : null;
}

// ── mappers ──────────────────────────────────────────────────────────────────

/**
 * Thresholds mirror the mock's score badges. Note `marriageScore` is the mean of three
 * {weak:30, average:60, strong:90} values, so only a handful of values are actually
 * reachable — the banding is coarse by construction, not by choice here.
 */
export function toBand(score: number | null): OutlookBand | null {
  if (score === null) return null;
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  return "average";
}

/** A strength read as a plus/watch-out. `average` is deliberately neither. */
export function strengthTone(s: Strength | null): Tone {
  if (s === "strong") return "positive";
  if (s === "weak") return "caution";
  return "neutral";
}

function scoreStrength(score: number | null): Strength | null {
  if (score === null) return null;
  if (score >= 70) return "strong";
  if (score >= 50) return "average";
  return "weak";
}

/** Earliest age band with any confidence at all — the "by what age" answer. */
function timingText(scores: Scores): string | null {
  const bands: AgeBand[] = isAgeBandArray(scores?.ageBands) ? scores.ageBands : [];
  const band = bands.find((b) => b.confidence !== "NONE") ?? bands[0];
  return band ? formatAgeRange(band) : null;
}

function buildHighlights(scores: Scores): HighlightTile[] {
  const score = num(scores, "marriageScore");
  const venus = strength(scores, "venusStrength");
  const stability = strength(scores, "seventhLordStrength");
  const timing = timingText(scores);
  const archetype = isArchetype(scores?.partnerArchetype) ? scores.partnerArchetype : null;

  const potential = scoreStrength(score);

  return [
    { key: "potential", strength: potential, text: null, tone: strengthTone(potential) },
    { key: "compatibility", strength: venus, text: null, tone: strengthTone(venus) },
    // A date range is neither good nor bad news; having one at all is the useful signal.
    { key: "timing", strength: null, text: timing, tone: timing ? "positive" : "neutral" },
    // An archetype describes a partner, it does not rank them — always neutral.
    { key: "spouse", strength: null, text: archetype?.label ?? null, tone: "neutral" },
    { key: "stability", strength: stability, text: null, tone: strengthTone(stability) },
  ];
}

/**
 * Venus (love), Jupiter (the dharma/marriage karaka) and whichever planet rules the
 * 7th house. `fourthLordStrength` is deliberately left out: `scores` carries its
 * strength but never names the planet, so there is no icon to draw and no reason
 * string to explain it — that factor surfaces in the Family & In-Laws narrative instead.
 * Venus appearing twice (once as karaka, once as 7th lord) is correct, not a duplicate.
 */
function buildPlanets(scores: Scores): PlanetImpact[] {
  const seventhLord = str(scores, "seventhLord");
  const rows: PlanetImpact[] = [
    {
      planet: "venus",
      role: "venus",
      strength: strength(scores, "venusStrength"),
      reason: str(scores, "venusReason"),
    },
    {
      planet: "jupiter",
      role: "jupiter",
      strength: strength(scores, "jupiterStrength"),
      reason: str(scores, "jupiterReason"),
    },
  ];
  if (seventhLord) {
    rows.push({
      planet: seventhLord.toLowerCase(),
      role: "seventhLord",
      strength: strength(scores, "seventhLordStrength"),
      reason: str(scores, "seventhLordReason"),
    });
  }
  return rows;
}

export function buildMarriageView(scores: Scores): MarriageView {
  const score = num(scores, "marriageScore");
  const highlights = buildHighlights(scores);
  const windows: RankedWindow[] = isRankedWindowArray(scores?.windows) ? scores.windows : [];

  return {
    score,
    band: toBand(score),
    highlights,
    positiveCount: highlights.filter((h) => h.tone === "positive").length,
    cautionCount: highlights.filter((h) => h.tone === "caution").length,
    planets: buildPlanets(scores),
    window: windows[0] ?? null,
    seventhHouse: {
      sign: str(scores, "seventhHouseSign"),
      lord: str(scores, "seventhLord"),
      strength: strength(scores, "seventhLordStrength"),
      temperament: str(scores, "seventhHouseTemperament"),
    },
    archetype: isArchetype(scores?.partnerArchetype) ? scores.partnerArchetype : null,
  };
}

/**
 * Icon per canonical section id (see jyotish-backend's config/report-sections.ts —
 * marriage's eight ids are fixed and assigned by position). Values are lucide icon
 * NAMES, resolved to components in components/reports/marriage/AnalysisAccordion.tsx;
 * keeping them as strings here is what lets this file stay React-free.
 */
export const SECTION_ICON: Record<string, string> = {
  at_a_glance: "Sparkles",
  marriage_timing: "CalendarHeart",
  who_you_will_marry: "UserRound",
  family_in_laws: "Home",
  money_after_marriage: "Wallet",
  going_for_you_and_hold_carefully: "Scale",
  marriage_quality_by_decade: "TrendingUp",
  modern_realities: "Globe",
};
