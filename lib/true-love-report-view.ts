/**
 * True Love view-model — turns the untyped `scores` bag the API returns into the shapes
 * the bespoke True Love screen renders.
 *
 * Same three constraints as lib/marriage-report-view.ts and lib/kundli-milan-report-view.ts,
 * for the same reasons — no React, no `t()`, no Tailwind class literals (the JIT does not
 * scan lib/). Token -> class tables live in components/reports/true-love/.
 *
 * Every field is read defensively rather than cast: `scores` is `Record<string, unknown>`
 * end to end and the backend recomputes it on every read, so a report generated before a
 * given field shipped simply omits it and each mapper degrades to null instead of throwing.
 */

/** Shared with marriage's OutlookBand thresholds (90-100 / 70-89 / 50-69 in the mock), but
 * declared here rather than imported so the two screens can diverge without one silently
 * re-banding the other. */
export type LoveBand = "excellent" | "good" | "average";

export interface Dial {
  /** 0-100. */
  score: number;
  band: LoveBand;
}

/**
 * Where the chart sits on the love-marriage <-> arranged-marriage axis.
 *
 * `loveVsArrangedTilt` is 0-10 from the backend (higher = more love-leaning). Exposed as a
 * 0-100 `pct` for bar geometry plus a three-way `lean` for the label, because the useful
 * reading is directional, not numeric — "6.5 out of 10" means nothing to a reader, while
 * "leans love marriage" does. The neutral band is deliberately wide (4-6): the underlying
 * formula mixes a handful of house/planet checks and does not support splitting hairs
 * around the midpoint.
 */
export interface Tilt {
  pct: number;
  lean: "love" | "balanced" | "arranged";
}

export interface TrueLoveView {
  romance: Dial | null;
  partnership: Dial | null;
  tilt: Tilt | null;
  /** Venus sitting in a key (5th/7th) house — a single yes/no the screen shows as a fact
   * chip. Null when the report predates the field, which renders nothing rather than "No". */
  venusInKeyHouse: boolean | null;
}

function readNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Same thresholds marriage's `toBand` uses. */
export function toLoveBand(score: number): LoveBand {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  return "average";
}

function readDial(v: unknown): Dial | null {
  const score = readNumber(v);
  if (score === null) return null;
  const clamped = Math.min(Math.max(Math.round(score), 0), 100);
  return { score: clamped, band: toLoveBand(clamped) };
}

function readTilt(v: unknown): Tilt | null {
  const raw = readNumber(v);
  if (raw === null) return null;
  const clamped = Math.min(Math.max(raw, 0), 10);
  return {
    pct: Math.round(clamped * 10),
    lean: clamped > 6 ? "love" : clamped < 4 ? "arranged" : "balanced",
  };
}

export function buildTrueLoveView(scores: Record<string, unknown>): TrueLoveView {
  return {
    romance: readDial(scores.romanceScore),
    partnership: readDial(scores.partnershipScore),
    tilt: readTilt(scores.loveVsArrangedTilt),
    venusInKeyHouse:
      typeof scores.venusInKeyHouse === "boolean" ? scores.venusInKeyHouse : null,
  };
}

/**
 * Lucide icon NAMES per canonical section id (jyotish-backend's config/report-sections.ts
 * lists true_love's 9). Names, not components, so this file stays React-free — the
 * name -> component table lives in the shared AnalysisAccordion.
 */
export const SECTION_ICON: Record<string, string> = {
  what_this_means_for_you: "Sparkles",
  family_blessing: "Home",
  timing_windows: "CalendarHeart",
  romantic_archetype: "UserRound",
  blessings_cautions: "Scale",
  romance_by_decade: "TrendingUp",
  naturally_drawn_to: "Heart",
  patterns_repeating: "Repeat",
  blocking_you_recognize_the_one: "Flame",
};
