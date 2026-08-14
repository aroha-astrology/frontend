/**
 * Wealth view-model — turns the untyped `scores` bag the API returns into the shapes the
 * bespoke Wealth screen renders.
 *
 * Same three constraints as the other report view-models (marriage, kundli-milan, true-love):
 * no React, no `t()`, no Tailwind class literals (the JIT does not scan `lib/`). Token -> class
 * tables live in components/reports/wealth/.
 *
 * Every field is read defensively rather than cast: a report generated before a given field
 * shipped simply omits it, and each mapper degrades to null/[] instead of throwing.
 */
import type { TiltLean } from "@/components/reports/TiltGauge";

/** The engine's only strength vocabulary (astro-engine/gemstones.ts). */
export type Strength = "weak" | "average" | "strong";

/** The 3-way shape the backend reads from 2nd-lord vs 11th-lord strength. */
export type WealthPattern = "steady_accumulation" | "volatile_gains" | "late_blooming";

/** The 3 classical income-source houses: 10th (salaried), 7th (business), 4th (property). */
export const INCOME_SOURCES = ["salaried", "business", "property"] as const;
export type IncomeSource = (typeof INCOME_SOURCES)[number];

const STRENGTHS: readonly string[] = ["weak", "average", "strong"];
const PATTERNS: readonly string[] = ["steady_accumulation", "volatile_gains", "late_blooming"];

/**
 * Overall wealth band. Deliberately NOT reusing marriage's 90/70/50 thresholds: `wealthScore` is
 * an unweighted average of three strength scores that the engine maps to 30/60/90, so in practice
 * it clusters in the 30-90 range and can never reach 90+ unless all three significators are
 * strong. Banding it at marriage's cut-points would make almost every chart read "average".
 */
export type WealthBand = "excellent" | "good" | "average" | "weak";

export function toWealthBand(score: number): WealthBand {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "average";
  return "weak";
}

export interface IncomePath {
  key: IncomeSource;
  strength: Strength;
  /** True for the single `strongestIncomeSource` the backend picked. Ties are already broken
   * server-side (salaried > business > property), so at most one path is flagged. */
  strongest: boolean;
}

export interface Significator {
  /** i18n key suffix, not display text — the backend does not expose the 2nd/11th lord's planet
   * NAME, only its strength, so these rows are labelled by role and carry no planet icon. */
  role: "secondLord" | "eleventhLord" | "jupiter";
  strength: Strength;
  /** Jupiter only — the house it occupies, when known. */
  house: number | null;
}

export interface WealthView {
  score: number | null;
  band: WealthBand | null;
  pattern: WealthPattern | null;
  tilt: { pct: number; lean: TiltLean } | null;
  significators: Significator[];
  incomePaths: IncomePath[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readStrength(v: unknown): Strength | null {
  return typeof v === "string" && STRENGTHS.includes(v) ? (v as Strength) : null;
}

function readScore(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(Math.max(Math.round(v), 0), 100);
}

/**
 * `spendingVsSavingTilt` is 0-10 (0 = saving/accumulation, 10 = spending/gains). Same wide
 * neutral band as true_love's tilt and for the same reason: the formula mixes a few
 * house/lord comparisons and does not support splitting hairs around the midpoint.
 */
function readTilt(v: unknown): { pct: number; lean: TiltLean } | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const clamped = Math.min(Math.max(v, 0), 10);
  return {
    pct: Math.round(clamped * 10),
    lean: clamped > 6 ? "high" : clamped < 4 ? "low" : "mid",
  };
}

function readSignificators(scores: Record<string, unknown>): Significator[] {
  const jupiterHouse = scores.jupiterHouse;
  const rows: Array<[Significator["role"], unknown, number | null]> = [
    ["secondLord", scores.secondLordStrength, null],
    ["eleventhLord", scores.eleventhLordStrength, null],
    [
      "jupiter",
      scores.jupiterStrength,
      typeof jupiterHouse === "number" && Number.isFinite(jupiterHouse) ? jupiterHouse : null,
    ],
  ];
  return rows.flatMap(([role, raw, house]) => {
    const strength = readStrength(raw);
    return strength ? [{ role, strength, house }] : [];
  });
}

/** Reads `incomeSourceStrengths` into the canonical 3-path order, flagging whichever the backend
 * named `strongestIncomeSource`. A path whose strength is missing is dropped rather than shown
 * as an unknown value. */
function readIncomePaths(scores: Record<string, unknown>): IncomePath[] {
  const map = scores.incomeSourceStrengths;
  if (!isRecord(map)) return [];
  const strongest = scores.strongestIncomeSource;
  return INCOME_SOURCES.flatMap((key) => {
    const strength = readStrength(map[key]);
    return strength ? [{ key, strength, strongest: strongest === key }] : [];
  });
}

export function buildWealthView(scores: Record<string, unknown>): WealthView {
  const score = readScore(scores.wealthScore);
  const pattern = scores.wealthPattern;

  return {
    score,
    band: score === null ? null : toWealthBand(score),
    pattern: typeof pattern === "string" && PATTERNS.includes(pattern)
      ? (pattern as WealthPattern)
      : null,
    tilt: readTilt(scores.spendingVsSavingTilt),
    significators: readSignificators(scores),
    incomePaths: readIncomePaths(scores),
  };
}

/**
 * Lucide icon NAMES per canonical section id (jyotish-backend's config/report-sections.ts lists
 * wealth's 9). Names, not components, so this file stays React-free.
 */
export const SECTION_ICON: Record<string, string> = {
  wealth_pattern: "Sparkles",
  practical_guidance: "Scale",
  wealth_timing: "CalendarHeart",
  money_archetype: "UserRound",
  dosha_yoga_check: "Flame",
  spending_vs_saving_tilt: "Wallet",
  wealth_by_decade: "TrendingUp",
  strongest_income_path: "Briefcase",
  guard_against: "ShieldAlert",
};
