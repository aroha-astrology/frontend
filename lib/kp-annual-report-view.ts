/**
 * KP Year Ahead view-model — turns the untyped `scores` bag the API returns for `kp_annual`
 * into the shapes the bespoke screen renders.
 *
 * Same constraints as the other report view-models: no React, no `t()`, no Tailwind class
 * literals (the JIT does not scan `lib/`). Every field is read defensively — a malformed or
 * older report degrades to empty lists, never a throw.
 *
 * There is deliberately no score anywhere in this report: the backend judges every life area
 * and every month in words (strong / steady / slow, peak / active / quiet), and this file only
 * passes those words through. See jyotish-backend's astro-engine/reports/kp-annual.ts.
 */
import type { ReportSection } from "@/lib/reports-api";

export const KP_AREAS = ["career", "money", "love", "health", "home", "travel", "learning", "family"] as const;
export type KpArea = (typeof KP_AREAS)[number];
export type KpTone = "peak" | "active" | "quiet";
export type KpPromise = "strong" | "steady" | "slow";
export type KpTopic = KpArea | "general";

export interface KpWindow {
  start: string;
  end: string;
  lords: string[];
}

export interface KpAreaView {
  key: KpArea;
  promise: KpPromise;
  principalCusp: number;
  cuspSubLord: string;
  peakMonths: number[];
  activeMonths: number[];
  bestWindow: KpWindow | null;
  sensitive: boolean;
}

export interface KpTransitView {
  planet: string;
  sign: string;
  nakshatra: string;
  starLord: string;
  subLord: string;
  natalHouse: number;
  retrograde: boolean;
}

export interface KpMonthView {
  index: number;
  start: string;
  end: string;
  mid: string;
  md: string;
  ad: string;
  pd: string;
  tones: Record<KpArea, KpTone>;
  focus: KpArea;
  care: "spending" | "rest" | null;
  transits: KpTransitView[];
  /** This month's paragraph from the narrative's month_by_month section, prefix stripped. */
  note: string | null;
}

export interface KpQuestionView {
  question: string;
  topic: KpTopic;
  promise: KpPromise;
  principalCusp: number;
  peakMonths: number[];
  activeMonths: number[];
  bestWindow: KpWindow | null;
  answer: string | null;
}

export interface KpCuspView {
  house: number;
  sign: string;
  nakshatra: string;
  starLord: string;
  subLord: string;
  sensitive: boolean;
}

export interface KpTransitChange {
  planet: string;
  monthIndex: number;
  fromSign: string;
  toSign: string;
}

export interface KpAnnualView {
  window: { start: string; end: string } | null;
  houseSystem: "placidus" | "equal";
  areas: KpAreaView[];
  months: KpMonthView[];
  questions: KpQuestionView[];
  dashaNow: { md: string; ad: string; pd: string; adEnds: string } | null;
  dashaShifts: Array<{ date: string; md: string; ad: string }>;
  rulingPlanets: Array<{ planet: string; role: string }>;
  cusps: KpCuspView[];
  /** Slow-planet positions at the start of the year. */
  transitsAtStart: KpTransitView[];
  /** Sign changes of the slow planets across the year, in order. */
  transitChanges: KpTransitChange[];
  /** Narrative sections that render in the accordion — the month notes and question answers
   * render inside their own cards instead. */
  narrative: ReportSection[];
}

/** Canonical section id -> lucide icon NAME (resolved in AnalysisAccordion). */
export const SECTION_ICON: Record<string, string> = {
  year_at_a_glance: "Sparkles",
  kp_blueprint: "Grid3x3",
  dasha_story: "Layers",
  transit_triggers: "Globe",
  career_money: "TrendingUp",
  love_family: "Heart",
  health_wellbeing: "Activity",
  home_travel_learning: "Home",
  guidance_remedies: "Flame",
  closing_note: "Leaf",
};

const TONES: readonly string[] = ["peak", "active", "quiet"];
const PROMISES: readonly string[] = ["strong", "steady", "slow"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function nums(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
}
function isArea(v: unknown): v is KpArea {
  return typeof v === "string" && (KP_AREAS as readonly string[]).includes(v);
}
function promise(v: unknown): KpPromise {
  return typeof v === "string" && PROMISES.includes(v) ? (v as KpPromise) : "steady";
}
function windowOf(v: unknown): KpWindow | null {
  if (!isRecord(v) || !str(v.start) || !str(v.end)) return null;
  return {
    start: str(v.start),
    end: str(v.end),
    lords: Array.isArray(v.lords) ? v.lords.filter((x): x is string => typeof x === "string") : [],
  };
}
function transitOf(v: unknown): KpTransitView | null {
  if (!isRecord(v) || !str(v.planet)) return null;
  return {
    planet: str(v.planet),
    sign: str(v.sign),
    nakshatra: str(v.nakshatra),
    starLord: str(v.starLord),
    subLord: str(v.subLord),
    natalHouse: num(v.natalHouse),
    retrograde: v.retrograde === true,
  };
}

/** "Oct 2026: Push for the raise." -> "Push for the raise." Only strips a short label. */
export function stripMonthPrefix(text: string): string {
  return text.replace(/^\s*[^:.!?]{3,22}:\s+/, "");
}

function sectionById(sections: ReportSection[], id: string): ReportSection | undefined {
  return sections.find((s) => s.id === id);
}

export function buildKpAnnualView(scores: Record<string, unknown>, sections: ReportSection[]): KpAnnualView {
  const sensitive = new Set(nums(scores.sensitiveCusps));

  const areas: KpAreaView[] = (Array.isArray(scores.areas) ? scores.areas : [])
    .filter(isRecord)
    .filter((a) => isArea(a.key))
    .map((a) => ({
      key: a.key as KpArea,
      promise: promise(a.promise),
      principalCusp: num(a.principalCusp),
      cuspSubLord: str(a.cuspSubLord),
      peakMonths: nums(a.peakMonths),
      activeMonths: nums(a.activeMonths),
      bestWindow: windowOf(a.bestWindow),
      sensitive: a.cuspNearBoundary === true,
    }));

  const monthSection = sectionById(sections, "month_by_month");
  const months: KpMonthView[] = (Array.isArray(scores.months) ? scores.months : [])
    .filter(isRecord)
    .map((m, i) => {
      const tonesRaw = isRecord(m.tones) ? m.tones : {};
      const tones = Object.fromEntries(
        KP_AREAS.map((k) => [k, TONES.includes(str(tonesRaw[k])) ? (tonesRaw[k] as KpTone) : "quiet"]),
      ) as Record<KpArea, KpTone>;
      const dasha = isRecord(m.dasha) ? m.dasha : {};
      const note = monthSection?.paragraphs[i];
      return {
        index: i,
        start: str(m.start),
        end: str(m.end),
        mid: str(m.mid),
        md: str(dasha.md),
        ad: str(dasha.ad),
        pd: str(dasha.pd),
        tones,
        focus: isArea(m.focus) ? m.focus : "career",
        care: m.care === "spending" || m.care === "rest" ? m.care : null,
        transits: (Array.isArray(m.transits) ? m.transits : [])
          .map(transitOf)
          .filter((t): t is KpTransitView => t !== null),
        note: note ? stripMonthPrefix(note) : null,
      };
    });

  const answers = sectionById(sections, "your_questions")?.paragraphs ?? [];
  const questions: KpQuestionView[] = (Array.isArray(scores.questions) ? scores.questions : [])
    .filter(isRecord)
    .map((q, i): KpQuestionView => ({
      question: str(q.question),
      topic: isArea(q.topic) ? q.topic : "general",
      promise: promise(q.promise),
      principalCusp: num(q.principalCusp),
      peakMonths: nums(q.peakMonths),
      activeMonths: nums(q.activeMonths),
      bestWindow: windowOf(q.bestWindow),
      answer: answers[i] ?? null,
    }))
    .filter((q) => q.question.length > 0);

  const cusps: KpCuspView[] = (Array.isArray(scores.cusps) ? scores.cusps : [])
    .filter(isRecord)
    .map((c) => ({
      house: num(c.house),
      sign: str(c.sign),
      nakshatra: str(c.nakshatra),
      starLord: str(c.starLord),
      subLord: str(c.subLord),
      sensitive: sensitive.has(num(c.house)),
    }));

  const transitChanges: KpTransitChange[] = [];
  for (let i = 1; i < months.length; i++) {
    for (const t of months[i]!.transits) {
      const prev = months[i - 1]!.transits.find((p) => p.planet === t.planet);
      if (prev && prev.sign && t.sign && prev.sign !== t.sign) {
        transitChanges.push({ planet: t.planet, monthIndex: i, fromSign: prev.sign, toSign: t.sign });
      }
    }
  }

  const dn = isRecord(scores.dashaNow) ? scores.dashaNow : null;
  const engine = isRecord(scores.engine) ? scores.engine : {};
  const win = isRecord(scores.window) ? scores.window : null;

  return {
    window: win && str(win.start) && str(win.end) ? { start: str(win.start), end: str(win.end) } : null,
    houseSystem: engine.houseSystem === "equal" ? "equal" : "placidus",
    areas,
    months,
    questions,
    dashaNow: dn && str(dn.md) ? { md: str(dn.md), ad: str(dn.ad), pd: str(dn.pd), adEnds: str(dn.adEnds) } : null,
    dashaShifts: (Array.isArray(scores.dashaShifts) ? scores.dashaShifts : [])
      .filter(isRecord)
      .map((s) => ({ date: str(s.date), md: str(s.md), ad: str(s.ad) }))
      .filter((s) => s.date && s.ad),
    rulingPlanets: (Array.isArray(scores.rulingPlanets) ? scores.rulingPlanets : [])
      .filter(isRecord)
      .map((r) => ({ planet: str(r.planet), role: str(r.role) }))
      .filter((r) => r.planet),
    cusps,
    transitsAtStart: months[0]?.transits ?? [],
    transitChanges,
    narrative: sections.filter((s) => s.id !== "month_by_month" && s.id !== "your_questions"),
  };
}

/** Areas ordered for the "where the year leans" highlight: strong promise first, then by
 * how many peak months the year gives it. */
export function strongestAreas(areas: KpAreaView[], limit = 3): KpAreaView[] {
  const rank = { strong: 0, steady: 1, slow: 2 } as const;
  return [...areas]
    .sort(
      (a, b) =>
        rank[a.promise] - rank[b.promise] ||
        b.peakMonths.length - a.peakMonths.length ||
        b.activeMonths.length - a.activeMonths.length,
    )
    .slice(0, limit);
}

/** "2026-09-25" -> "Sep". Short month name for the heatmap header, UTC. */
export function shortMonth(dateKey: string, locale = "en-IN"): string {
  const [y, m, d] = dateKey.slice(0, 10).split("-").map(Number);
  if (!y || !m) return "";
  return new Date(Date.UTC(y, m - 1, d || 1)).toLocaleDateString(locale, { month: "short", timeZone: "UTC" });
}

/** "2026-10-25".."2026-11-25" -> "25 Oct – 24 Nov" (end is exclusive on the backend). */
export function monthRangeLabel(start: string, end: string, locale = "en-IN"): string {
  const fmt = (dk: string, offsetDays = 0) => {
    const [y, m, d] = dk.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return "";
    const dt = new Date(Date.UTC(y, m - 1, d) + offsetDays * 86_400_000);
    return dt.toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  };
  return `${fmt(start)} – ${fmt(end, -1)}`;
}
