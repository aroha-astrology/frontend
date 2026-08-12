/**
 * Kundli Milan view-model — turns the untyped `scores` bag the API returns into
 * the handful of shapes the bespoke Kundli Milan screen renders.
 *
 * Same three constraints as lib/marriage-report-view.ts, for the same reasons —
 * no React, no `t()`, no Tailwind class literals (the JIT does not scan lib/, so
 * a class named only here compiles to nothing). Token -> class tables live in
 * components/reports/kundli-milan/.
 *
 * Every field is read defensively rather than cast: `scores` is
 * `Record<string, unknown>` end to end (see lib/reports-api.ts) and the backend
 * recomputes it fresh on every read, so a report generated before a given field
 * shipped simply omits it and each mapper degrades to null/[] instead of throwing.
 *
 * What this report genuinely has that `marriage` did not: two people. Only
 * `manglikStatus` is truly two-sided though — `primaryDoshaYoga`, `header`,
 * `lifeContext` and `gemstones` are all scoped to the PURCHASING user's chart by
 * deliberate backend design (see the doc comment on `primaryDoshaYoga` in
 * jyotish-backend's astro-engine/reports/kundli-milan.ts, which spells out that
 * there is no partner dosha data to show and fabricating it would be worse than
 * omitting it). So nothing here builds a symmetric You/Partner panel.
 */
import {
  MATCH_RISK_AREA_ORDER,
  type MatchRiskAreaKey,
  type RiskSeverity,
} from "./reports-api";
import { isKootaBreakdownArray, type KootaEntry } from "./report-score-facts";

/** The backend's own Ashtakoota banding (astro-engine/reports/kundli-milan.ts):
 * <18 poor, 18-24 average, 25-32 good, 33-36 excellent. Re-derived here only as a
 * fallback — `compatibilityBand` is read straight off `scores` when present, so the
 * screen never disagrees with the narrative the LLM was grounded on. */
export type CompatibilityBand = "poor" | "average" | "good" | "excellent";

const BANDS: readonly CompatibilityBand[] = ["poor", "average", "good", "excellent"];

/** Severities that read as a warning — the two the grid counts as cautions and the
 * summary line calls out. Mirrors MatchReportCards' own grouping so the two surfaces
 * can never disagree about what counts as a risk. */
const CAUTION_SEVERITIES: readonly RiskSeverity[] = ["caution", "serious"];

const SEVERITIES: readonly RiskSeverity[] = ["benefit", "neutral", "caution", "serious"];

export interface ScorePair {
  score: number;
  max: number;
  /** 0-100, for the ring's arc length only — never shown as a number. Guna Milan is read
   * as "N out of 36" by every astrologer and user; a percentage would be a foreign unit. */
  pct: number;
}

export interface ManglikState {
  person1: boolean;
  person2: boolean;
  /** Classically cancelled for at least one person (own sign, exaltation, benefic
   * conjunction/aspect, or a documented house+sign exception — the backend reuses
   * detectMangalDosha's `type` verbatim, it is not re-derived). */
  cancelled: boolean;
  /**
   * The fact that actually matters classically: Mangal Dosha is a problem when it is
   * ONE-SIDED. Two manglik partners cancel each other, and two non-manglik partners
   * never had the issue — both are `matched`. Same rule app/compatibility/page.tsx
   * already applies to this exact field; kept identical so the free matcher and the
   * paid report can never render opposite verdicts on the same two charts.
   */
  matched: boolean;
}

export interface LifeArea {
  key: MatchRiskAreaKey;
  severity: RiskSeverity;
}

export interface KundliMilanView {
  guna: ScorePair | null;
  band: CompatibilityBand | null;
  dashakoota: ScorePair | null;
  /** calculateDashakoota's own verdict, when the report is new enough to carry it. */
  dashakootaVerdict: string | null;
  gunaBreakdown: KootaEntry[];
  dashakootaBreakdown: KootaEntry[];
  manglik: ManglikState | null;
  /** The 8 life areas in canonical order — deliberately NOT re-sorted by severity, so the
   * grid holds still between two people's reports and stays scannable by position. */
  areas: LifeArea[];
  benefitCount: number;
  cautionCount: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** A score/max pair, or null unless BOTH are present and `max` is usable as a divisor —
 * a bare score with no maximum is unreadable ("22" out of what?) and a zero max would
 * make `pct` NaN and silently blank the ring. */
function readScorePair(score: unknown, max: unknown): ScorePair | null {
  const s = readNumber(score);
  const m = readNumber(max);
  if (s === null || m === null || m <= 0) return null;
  const clamped = Math.min(Math.max(s, 0), m);
  return { score: s, max: m, pct: Math.round((clamped / m) * 100) };
}

function bandFromGuna(pair: ScorePair | null): CompatibilityBand | null {
  if (!pair || pair.max !== 36) return null; // only the classical 36-point scale bands this way
  if (pair.score < 18) return "poor";
  if (pair.score < 25) return "average";
  if (pair.score < 33) return "good";
  return "excellent";
}

function readBand(v: unknown, guna: ScorePair | null): CompatibilityBand | null {
  if (typeof v === "string" && (BANDS as readonly string[]).includes(v)) {
    return v as CompatibilityBand;
  }
  return bandFromGuna(guna);
}

function readManglik(v: unknown): ManglikState | null {
  if (!isRecord(v)) return null;
  const { person1, person2, cancelled } = v;
  if (typeof person1 !== "boolean" || typeof person2 !== "boolean") return null;
  return {
    person1,
    person2,
    cancelled: cancelled === true,
    matched: person1 === person2,
  };
}

/** Reads `riskFactors` into the canonical 8-area order, dropping anything malformed or
 * unrecognised. An area the backend did not return is simply absent from the grid rather
 * than rendered as an unknown-severity tile. */
function readAreas(v: unknown): LifeArea[] {
  if (!Array.isArray(v)) return [];
  const byKey = new Map<string, RiskSeverity>();
  for (const item of v) {
    if (!isRecord(item)) continue;
    const { key, severity } = item;
    if (typeof key !== "string" || typeof severity !== "string") continue;
    if (!(SEVERITIES as readonly string[]).includes(severity)) continue;
    byKey.set(key, severity as RiskSeverity);
  }
  return MATCH_RISK_AREA_ORDER.flatMap((key) => {
    const severity = byKey.get(key);
    return severity ? [{ key, severity }] : [];
  });
}

function readKootas(v: unknown): KootaEntry[] {
  return isKootaBreakdownArray(v) ? v : [];
}

export function buildKundliMilanView(scores: Record<string, unknown>): KundliMilanView {
  const guna = readScorePair(scores.gunaMilanScore, scores.gunaMaxScore);
  const areas = readAreas(scores.riskFactors);

  return {
    guna,
    band: readBand(scores.compatibilityBand, guna),
    dashakoota: readScorePair(scores.dashakootaScore, scores.dashakootaMaxScore),
    dashakootaVerdict:
      typeof scores.dashakootaCompatibility === "string" ? scores.dashakootaCompatibility : null,
    gunaBreakdown: readKootas(scores.gunaBreakdown),
    dashakootaBreakdown: readKootas(scores.dashakootaBreakdown),
    manglik: readManglik(scores.manglikStatus),
    areas,
    benefitCount: areas.filter((a) => a.severity === "benefit").length,
    cautionCount: areas.filter((a) => CAUTION_SEVERITIES.includes(a.severity)).length,
  };
}

/**
 * Lucide icon NAMES per canonical section id (jyotish-backend's config/report-sections.ts
 * lists kundli_milan's 7). Names, not components, so this file stays React-free — the
 * name -> component table lives in the accordion, same split marriage uses.
 */
export const SECTION_ICON: Record<string, string> = {
  guna_milan_score_meaning: "Sparkles",
  dashakoota_deep_dive: "Layers",
  manglik_compatibility: "Flame",
  chart_additional_facts: "FileText",
  overall_recommendation: "Scale",
  health_wealth_career_compatibility: "Activity",
  children_family_harmony_timing: "Home",
};
