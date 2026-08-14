/**
 * Shared view-model for the MONTHLY report types — career_monthly, health_monthly,
 * finance_monthly and relationship_monthly all compute the same core shape
 * (`periodMonth`, `activeMahadashaLord`, `activeAntardashaLord`, `monthScore`, `keyHouses`,
 * `tone`, `doshaYoga`, `subPeriods`; see jyotish-backend's
 * astro-engine/reports/monthly-dasha-context.ts). Only the extras differ — career adds a work
 * archetype and industry fit, the others add little or nothing.
 *
 * Built shared from the first monthly screen rather than after the third, because unlike the
 * one-off reports these four are the SAME report with a different key-house set; a per-report
 * copy would be four copies of one thing, not four things.
 *
 * Same three constraints as the other report view-models: no React, no `t()`, no Tailwind class
 * literals (the JIT does not scan `lib/`).
 */

/** The backend's own 3-way month verdict (monthly-dasha-context.ts). */
export type MonthlyTone = "challenging" | "mixed" | "favorable";

const TONES: readonly string[] = ["challenging", "mixed", "favorable"];

export interface SubPeriod {
  /** ISO date strings — `Date` objects on the backend, serialised over JSON. */
  startDate: string;
  endDate: string;
  /** The Pratyantardasha lord ruling this slice; lowercased for /planets/<name>.png. */
  lord: string;
  score: number;
  /** Scored notably above/below the month's own score. Drives the highlight, so a reader can
   * see at a glance which stretch of the month actually differs from its overall tone. */
  standout: "better" | "worse" | null;
}

export interface MonthlyView {
  /** "YYYY-MM" as returned; formatting is the caller's job (it needs the active locale). */
  periodMonth: string | null;
  score: number | null;
  tone: MonthlyTone | null;
  /** Lowercased for /planets/<name>.png; null when the backend could not resolve a period. */
  mahadashaLord: string | null;
  antardashaLord: string | null;
  keyHouses: number[];
  subPeriods: SubPeriod[];
}

/** A slice must differ from the month's own score by more than this to be called out. Below it,
 * the difference is inside the noise of a formula that moves in ±15 steps. */
const STANDOUT_MARGIN = 10;

function readNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function readScore(v: unknown): number | null {
  const n = readNumber(v);
  return n === null ? null : Math.min(Math.max(Math.round(n), 0), 100);
}

function readLord(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.toLowerCase() : null;
}

function readDate(v: unknown): string | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  // Backend sends Date objects; JSON.stringify makes them ISO strings. Keep the date part only.
  return v.slice(0, 10);
}

function readSubPeriods(v: unknown, monthScore: number | null): SubPeriod[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as Record<string, unknown>;
    const startDate = readDate(row.startDate);
    const endDate = readDate(row.endDate);
    const lord = readLord(row.lord);
    const score = readScore(row.score);
    if (!startDate || !endDate || !lord || score === null) return [];
    const diff = monthScore === null ? 0 : score - monthScore;
    return [
      {
        startDate,
        endDate,
        lord,
        score,
        standout: diff > STANDOUT_MARGIN ? "better" : diff < -STANDOUT_MARGIN ? "worse" : null,
      },
    ];
  });
}

export function buildMonthlyView(scores: Record<string, unknown>): MonthlyView {
  const score = readScore(scores.monthScore);
  const tone = scores.tone;
  const keyHouses = Array.isArray(scores.keyHouses)
    ? scores.keyHouses.filter((h): h is number => typeof h === "number" && Number.isFinite(h))
    : [];

  return {
    periodMonth: typeof scores.periodMonth === "string" ? scores.periodMonth : null,
    score,
    tone: typeof tone === "string" && TONES.includes(tone) ? (tone as MonthlyTone) : null,
    mahadashaLord: readLord(scores.activeMahadashaLord),
    antardashaLord: readLord(scores.activeAntardashaLord),
    keyHouses,
    subPeriods: readSubPeriods(scores.subPeriods, score),
  };
}

/**
 * The fixed 10th-house-lord -> industry catalogue the backend emits as plain English strings
 * (career-monthly.ts's INDUSTRY_FIT_BY_PLANET). Slugged here so each can be looked up as an
 * i18n key; an industry not in this map falls back to the raw string, the same graceful
 * degradation GunaKootaBreakdown applies to unrecognised koota names.
 */
export function industrySlug(industry: string): string {
  return industry
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
