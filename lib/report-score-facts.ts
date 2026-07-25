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

export type ScoreFact = RingFact | BadgeFact | BooleanFact | NestedFact | RawFact;

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
