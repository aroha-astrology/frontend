/**
 * Generic renderer logic for a report's `scores` payload. Each of the 10
 * report types has a different `scores` shape (marriage has `marriageScore`/
 * `band`/`manglik`/timing windows; kundli_milan has `gunaMilanScore`/
 * `manglikStatus`; monthly reports have `monthScore`/`tone`; baby_name has
 * `moonNakshatra`/`startingSyllables`; etc.) — rather than hand-building 10
 * bespoke visualizations, this classifies each key/value pair generically:
 *
 *   - a plausible-range number  -> a ring/bar fact (0-100, or 0-36 for a
 *     guna/koota/milan-named key, matching Ashtakoota's 36-point scale)
 *   - a short string/enum       -> a labeled badge
 *   - a boolean                 -> a labeled yes/no chip (the component
 *     renders the actual "Yes"/"No" text via t(), so it stays translated —
 *     this module only carries the raw boolean)
 *   - an object/array           -> a nested key/value list rather than being
 *     skipped
 *
 * Deeply-nested values (inside an object/array fact) are rendered with
 * generic humanization/symbols (✓/✗ for booleans) rather than translated —
 * this is arbitrary, backend/LLM-controlled JSON whose keys aren't known
 * ahead of time, not authored UI copy, matching this app's existing
 * precedent for LLM-adjacent JSON (see components/vastu/AnalysisPanel.tsx's
 * `elementBalance`/`directionGuidance` rendering, which is equally
 * untranslated dynamic content).
 *
 * Kept dependency-free (no React) so it's unit-testable with plain vitest —
 * see report-score-facts.test.ts.
 */

function toWords(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}

function titleCase(s: string): string {
  return s.replace(/\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

/** "marriageScore" -> "Marriage Score", "moon_nakshatra" -> "Moon Nakshatra". */
export function humanizeKey(key: string): string {
  return titleCase(toWords(key));
}

/**
 * Known `scores` keys, mapped to i18n keys under `reportScores.label.*`, for
 * the report types with the highest traffic (marriage, kundli_milan,
 * match_report) plus the fields shared by all 4 monthly report types
 * (career/finance/health/relationship). Anything not listed here — including
 * the report-specific fields of the lower-traffic report types (numerology,
 * baby_name, name_change, past_life, wealth, true_love) — falls back to
 * `humanizeKey(key)` (English title-case) at the call site, same as before
 * this dictionary existed. Extend this incrementally rather than attempting
 * every report type's full key set at once — see this module's top doc
 * comment for why keys aren't a fully enumerable, stable set to begin with.
 */
export const SCORE_FACT_LABEL_KEYS: Record<string, string> = {
  // marriage
  marriageScore: "reportScores.label.marriageScore",
  band: "reportScores.label.band",
  manglik: "reportScores.label.manglik",
  seventhLord: "reportScores.label.seventhLord",
  seventhLordStrength: "reportScores.label.seventhLordStrength",
  venusStrength: "reportScores.label.venusStrength",
  venusHouse: "reportScores.label.venusHouse",
  jupiterStrength: "reportScores.label.jupiterStrength",
  jupiterHouse: "reportScores.label.jupiterHouse",
  seventhHouseSign: "reportScores.label.seventhHouseSign",
  seventhHouseTemperament: "reportScores.label.seventhHouseTemperament",
  fourthLordStrength: "reportScores.label.fourthLordStrength",
  jupiterDharmaWindow: "reportScores.label.jupiterDharmaWindow",
  seventhLordReason: "reportScores.label.seventhLordReason",
  venusReason: "reportScores.label.venusReason",
  jupiterReason: "reportScores.label.jupiterReason",
  doshaYoga: "reportScores.label.doshaYoga",
  partnerArchetype: "reportScores.label.partnerArchetype",
  marriageQualityArc: "reportScores.label.marriageQualityArc",
  inLaws: "reportScores.label.inLaws",
  moneyAfterMarriage: "reportScores.label.moneyAfterMarriage",
  modernRealities: "reportScores.label.modernRealities",
  windows: "reportScores.label.windows",
  ageBands: "reportScores.label.ageBands",
  // kundli_milan / match_report
  gunaMilanScore: "reportScores.label.gunaMilanScore",
  gunaMaxScore: "reportScores.label.gunaMaxScore",
  gunaBreakdown: "reportScores.label.gunaBreakdown",
  dashakootaScore: "reportScores.label.dashakootaScore",
  dashakootaMaxScore: "reportScores.label.dashakootaMaxScore",
  dashakootaBreakdown: "reportScores.label.dashakootaBreakdown",
  manglikStatus: "reportScores.label.manglikStatus",
  compatibilityBand: "reportScores.label.compatibilityBand",
  primaryDoshaYoga: "reportScores.label.doshaYoga",
  riskFactors: "reportScores.label.riskFactors",
  // shared by all 4 monthly report types (career/finance/health/relationship)
  periodMonth: "reportScores.label.periodMonth",
  activeMahadashaLord: "reportScores.label.activeMahadashaLord",
  activeAntardashaLord: "reportScores.label.activeAntardashaLord",
  monthScore: "reportScores.label.monthScore",
  keyHouses: "reportScores.label.keyHouses",
  tone: "reportScores.label.tone",
};

/** "steady" -> "Steady", "veryGood" -> "Very Good". */
export function humanizeValue(value: string): string {
  return titleCase(toWords(value));
}

function scoreMaxFor(key: string): number {
  const k = key.toLowerCase();
  if (k.includes("guna") || k.includes("milan") || k.includes("koota") || k.includes("kuta")) return 36;
  return 100;
}

function formatNestedValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "string") return humanizeValue(v);
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "—";
  if (Array.isArray(v)) return v.length ? v.map(formatNestedValue).join(", ") : "—";
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, vv]) => `${humanizeKey(k)}: ${formatNestedValue(vv)}`)
      .join(" · ");
  }
  return String(v);
}

export interface NestedEntry {
  label: string;
  display: string;
}

export interface RingFact {
  key: string;
  label: string;
  type: "ring";
  value: number;
  max: number;
  pct: number;
}
export interface BadgeFact {
  key: string;
  label: string;
  type: "badge";
  value: string;
}
export interface BooleanFact {
  key: string;
  label: string;
  type: "boolean";
  value: boolean;
}
export interface NestedFact {
  key: string;
  label: string;
  type: "nested";
  entries: NestedEntry[];
}
export interface RawFact {
  key: string;
  label: string;
  type: "raw";
  value: string;
}

/*
 * ─── Bespoke report-enrichment shapes ───────────────────────────────────────
 *
 * Backend enrichment (10 paid report types) adds 5 recurring data shapes to
 * `scores`, under DIFFERENT field names per report type (e.g. an archetype is
 * `partnerArchetype` on marriage, `moneyArchetype` on wealth, `workArchetype`
 * on career_monthly, plain `archetype` on true_love — same VALUE shape, no
 * fixed key). So these are detected by VALUE SHAPE, not by key name, unlike
 * everything above. Two of the five (`windows`/`ageBands`) do use a
 * consistent field name in practice, but shape detection is used uniformly
 * for all 5 anyway — the field name is never inspected.
 */

/** Ranked marriage/career/etc. timing window — appears as `scores.windows: RankedWindow[]`. */
export interface RankedWindow {
  startDate: string;
  endDate: string;
  score: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  dashaLevel: "antardasha" | "pratyantardasha";
  reasoning: string[];
  /** Plain-English "why this window" one-liner, generated once at report-creation time (see
   * jyotish-backend's lib/llm/reports/window-summary.ts) and spliced onto this window on read.
   * Absent for a report generated before this feature shipped, or if that LLM call failed —
   * TimingWindowsCard falls back to a filtered `reasoning` in that case. */
  summary?: string;
}

/** Age-band confidence table — appears as `scores.ageBands: AgeBand[]`. */
export interface AgeBand {
  label: string;
  startAge: number;
  endAge: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

/** Archetype + trait-tilt — field name varies (partnerArchetype/moneyArchetype/workArchetype/archetype). */
export interface Archetype {
  label: string;
  description: string;
  traits: { label: string; score: number }[];
}

/** Decade-by-decade forecast arc — field name varies (marriageQualityArc/romanceArc/wealthArc), value is an array of these. */
export interface DecadeBand {
  label: string;
  startDate: string;
  endDate: string;
  score: number;
  tone: "challenging" | "mixed" | "favorable";
}

/** Dosha & Yoga summary — `doshaYoga` on most reports, `primaryDoshaYoga` on kundli_milan. */
export interface DoshaYogaSummary {
  positives: { label: string; detail: string }[];
  cautions: { label: string; detail: string }[];
}

/** Guna/koota compatibility breakdown — `gunaBreakdown` (36-point Ashtakoota) or
 * `dashakootaBreakdown` (10-point Dashakoota) on kundli_milan/match_report. */
export interface KootaEntry {
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface TimingWindowsFact {
  key: string;
  label: string;
  type: "timingWindows";
  windows: RankedWindow[];
}
export interface AgeBandsFact {
  key: string;
  label: string;
  type: "ageBands";
  bands: AgeBand[];
}
export interface ArchetypeFact {
  key: string;
  label: string;
  type: "archetype";
  archetype: Archetype;
}
export interface DecadeArcFact {
  key: string;
  label: string;
  type: "decadeArc";
  bands: DecadeBand[];
}
export interface DoshaYogaFact {
  key: string;
  label: string;
  type: "doshaYoga";
  summary: DoshaYogaSummary;
}
export interface KootaBreakdownFact {
  key: string;
  label: string;
  type: "kootaBreakdown";
  entries: KootaEntry[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isLabelDetailArray(v: unknown): v is { label: string; detail: string }[] {
  return (
    Array.isArray(v) &&
    v.every((item) => isRecord(item) && typeof item.label === "string" && typeof item.detail === "string")
  );
}

const RANKED_WINDOW_LEVELS = new Set(["HIGH", "MEDIUM", "LOW"]);
const AGE_BAND_CONFIDENCES = new Set(["HIGH", "MEDIUM", "LOW", "NONE"]);
const DECADE_BAND_TONES = new Set(["challenging", "mixed", "favorable"]);

/**
 * Distinguished from AgeBand/DecadeBand arrays by requiring BOTH `level` (an
 * uppercase HIGH/MEDIUM/LOW enum) AND `reasoning` (an array) on every item —
 * neither AgeBand nor DecadeBand carries either field, so there's no overlap.
 */
export function isRankedWindowArray(v: unknown): v is RankedWindow[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every(
    (item) =>
      isRecord(item) &&
      typeof item.startDate === "string" &&
      typeof item.endDate === "string" &&
      typeof item.level === "string" &&
      RANKED_WINDOW_LEVELS.has(item.level) &&
      Array.isArray(item.reasoning)
  );
}

/**
 * Distinguished from RankedWindow/DecadeBand arrays by requiring BOTH
 * `startAge` (a number) AND `confidence` (an uppercase HIGH/MEDIUM/LOW/NONE
 * enum, distinct from DecadeBand's lowercase `tone` enum) on every item.
 */
export function isAgeBandArray(v: unknown): v is AgeBand[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every(
    (item) =>
      isRecord(item) &&
      typeof item.label === "string" &&
      typeof item.startAge === "number" &&
      typeof item.confidence === "string" &&
      AGE_BAND_CONFIDENCES.has(item.confidence)
  );
}

/**
 * Distinguished from RankedWindow/AgeBand arrays by requiring `tone` (a
 * lowercase challenging/mixed/favorable enum) on every item — neither of the
 * other two shapes carries a `tone` field.
 */
export function isDecadeBandArray(v: unknown): v is DecadeBand[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every(
    (item) =>
      isRecord(item) &&
      typeof item.label === "string" &&
      typeof item.score === "number" &&
      typeof item.tone === "string" &&
      DECADE_BAND_TONES.has(item.tone)
  );
}

/** An object (not array) with `label`/`description`/`traits` (array of `{label, score}`). */
export function isArchetype(v: unknown): v is Archetype {
  if (!isRecord(v)) return false;
  if (typeof v.label !== "string" || typeof v.description !== "string") return false;
  if (!Array.isArray(v.traits) || v.traits.length === 0) return false;
  return v.traits.every((t) => isRecord(t) && typeof t.label === "string" && typeof t.score === "number");
}

/** An object with `positives`/`cautions`, both arrays of `{label, detail}` (either may legitimately be empty — "no doshas/yogas found" is a valid result, not a detection failure). */
export function isDoshaYogaSummary(v: unknown): v is DoshaYogaSummary {
  if (!isRecord(v)) return false;
  return isLabelDetailArray(v.positives) && isLabelDetailArray(v.cautions);
}

/** Distinguished from the other 4 array shapes by requiring `maxScore` AND `description` on
 * every item — none of RankedWindow/AgeBand/DecadeBand carry either field. */
export function isKootaBreakdownArray(v: unknown): v is KootaEntry[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every(
    (item) =>
      isRecord(item) &&
      typeof item.name === "string" &&
      typeof item.score === "number" &&
      typeof item.maxScore === "number" &&
      typeof item.description === "string"
  );
}

export type ScoreFact =
  | RingFact
  | BadgeFact
  | BooleanFact
  | NestedFact
  | RawFact
  | TimingWindowsFact
  | AgeBandsFact
  | ArchetypeFact
  | DecadeArcFact
  | DoshaYogaFact
  | KootaBreakdownFact;

/**
 * Classifies one `scores` entry. Returns `null` for a value that shouldn't
 * render at all (null/undefined/empty string/empty collection) rather than
 * producing an empty-looking fact card. Defensive `typeof`/`Array.isArray`
 * checks throughout — matches AnalysisPanel.tsx's established defensiveness
 * for LLM-adjacent JSON; must not crash on any shape.
 */
export function buildScoreFact(key: string, value: unknown): ScoreFact | null {
  const label = humanizeKey(key);
  if (value === null || value === undefined) return null;

  // Bespoke shape detection runs FIRST, by VALUE shape (never by `key`) — the
  // 5 enrichment shapes are named differently per report type. Order among
  // the three array-shaped detectors doesn't affect correctness (their
  // required-field combinations are mutually exclusive — see each detector's
  // doc comment) but is kept in a fixed, readable order.
  if (isRankedWindowArray(value)) {
    return { key, label, type: "timingWindows", windows: value };
  }
  if (isAgeBandArray(value)) {
    return { key, label, type: "ageBands", bands: value };
  }
  if (isDecadeBandArray(value)) {
    return { key, label, type: "decadeArc", bands: value };
  }
  if (isArchetype(value)) {
    return { key, label, type: "archetype", archetype: value };
  }
  if (isDoshaYogaSummary(value)) {
    return { key, label, type: "doshaYoga", summary: value };
  }
  if (isKootaBreakdownArray(value)) {
    return { key, label, type: "kootaBreakdown", entries: value };
  }

  if (typeof value === "boolean") {
    return { key, label, type: "boolean", value };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const max = scoreMaxFor(key);
    if (value >= 0 && value <= max) {
      return { key, label, type: "ring", value, max, pct: Math.round((value / max) * 100) };
    }
    return { key, label, type: "raw", value: String(value) };
  }

  if (typeof value === "string") {
    if (value.trim() === "") return null;
    return { key, label, type: "badge", value: humanizeValue(value) };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return {
      key,
      label,
      type: "nested",
      entries: value.map((item, i) => ({ label: String(i + 1), display: formatNestedValue(item) })),
    };
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => ({ label: humanizeKey(k), display: formatNestedValue(v) }));
    if (entries.length === 0) return null;
    return { key, label, type: "nested", entries };
  }

  return { key, label, type: "raw", value: String(value) };
}

/** Builds the full list of renderable facts from a report's `scores` object, preserving key order. Never throws — an unexpected shape (non-object, null) just yields an empty list. */
export function buildScoreFacts(scores: Record<string, unknown> | null | undefined): ScoreFact[] {
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) return [];
  return Object.entries(scores)
    .map(([k, v]) => buildScoreFact(k, v))
    .filter((f): f is ScoreFact => f !== null);
}
