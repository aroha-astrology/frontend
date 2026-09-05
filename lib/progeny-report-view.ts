/**
 * Progeny view-model — turns the untyped `scores` bag the API returns into the shapes the
 * bespoke Progeny screen renders.
 *
 * Same three constraints as the other report view-models (marriage, wealth, kundli-milan): no
 * React, no `t()`, no Tailwind class literals (the JIT does not scan `lib/`). Every field is
 * read defensively rather than cast, and degrades to null/[] instead of throwing — a report
 * generated before a given field shipped, or a chart too sparse to compute it, simply omits it.
 *
 * Mirrors jyotish-backend/src/lib/astro-engine/reports/progeny.ts's ProgenyScores shape.
 */

export type PromiseBand = "Strong" | "Moderate" | "Mixed" | "Weak";
export type ConvergenceBand = "Strong convergence" | "Moderate convergence" | "Mixed" | "Conflict";
export type SphutaKind = "beeja" | "kshetra";
export type SphutaStrength = "strong" | "moderate" | "weak";
export type Tendency = "male" | "female" | "inconclusive";
export type Confidence = "low" | "moderate";

const PROMISE_BANDS: readonly string[] = ["Strong", "Moderate", "Mixed", "Weak"];
const CONVERGENCE_BANDS: readonly string[] = [
  "Strong convergence",
  "Moderate convergence",
  "Mixed",
  "Conflict",
];
const TENDENCIES: readonly string[] = ["male", "female", "inconclusive"];
const CONFIDENCES: readonly string[] = ["low", "moderate"];

export interface SphutaView {
  kind: SphutaKind;
  rasi: string;
  navamsa: string;
  strength: SphutaStrength;
}

export interface PromiseView {
  band: PromiseBand;
  sphuta: SphutaView | null;
  isChidraTithi: boolean;
}

export interface ChildSlotView {
  index: number;
  sign: string;
  tendency: Tendency;
  confidence: Confidence;
  obstructionScore: number;
}

export interface ChildrenCardView {
  likelyCount: number;
  sequence: { index: number; tendency: Tendency; confidence: Confidence; obstructionScore: number }[];
}

export interface ProgenyView {
  motherPromise: PromiseView | null;
  fatherPromise: PromiseView | null;
  coupleConvergence: ConvergenceBand | null;
  childSequence: ChildSlotView[];
  childrenCard: ChildrenCardView | null;
  spouseName: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readBand(v: unknown): PromiseBand | null {
  return typeof v === "string" && PROMISE_BANDS.includes(v) ? (v as PromiseBand) : null;
}

function readTendency(v: unknown): Tendency {
  return typeof v === "string" && TENDENCIES.includes(v) ? (v as Tendency) : "inconclusive";
}

function readConfidence(v: unknown): Confidence {
  return typeof v === "string" && CONFIDENCES.includes(v) ? (v as Confidence) : "low";
}

function readSphuta(v: unknown): SphutaView | null {
  if (!isRecord(v)) return null;
  const kind = v.kind === "beeja" || v.kind === "kshetra" ? v.kind : null;
  const rasi = typeof v.rasi === "string" ? v.rasi : null;
  const navamsa = typeof v.navamsa === "string" ? v.navamsa : null;
  const strength =
    v.strength === "strong" || v.strength === "moderate" || v.strength === "weak"
      ? v.strength
      : null;
  if (!kind || !rasi || !navamsa || !strength) return null;
  return { kind, rasi, navamsa, strength };
}

function readPromise(v: unknown): PromiseView | null {
  if (!isRecord(v)) return null;
  const band = readBand(v.band);
  if (!band) return null;
  const putraTithi = isRecord(v.putraTithi) ? v.putraTithi : null;
  return {
    band,
    sphuta: readSphuta(v.sphuta),
    isChidraTithi: putraTithi?.isChidra === true,
  };
}

/** Reads one D7Progeny object's `methodA` slots into the flat per-child list the screen shows. */
function readChildSequence(v: unknown): ChildSlotView[] {
  if (!isRecord(v)) return [];
  const methodA = isRecord(v.methodA) ? v.methodA : null;
  const slots = Array.isArray(methodA?.slots) ? methodA.slots : [];
  return slots.flatMap((raw) => {
    if (!isRecord(raw)) return [];
    const index = typeof raw.index === "number" ? raw.index : null;
    const sign = typeof raw.sign === "string" ? raw.sign : null;
    const sex = isRecord(raw.sex) ? raw.sex : null;
    const obstructionScore = typeof raw.obstructionScore === "number" ? raw.obstructionScore : 0;
    if (index == null || !sign) return [];
    return [
      {
        index,
        sign,
        tendency: readTendency(sex?.tendency),
        confidence: readConfidence(sex?.confidence),
        obstructionScore,
      },
    ];
  });
}

function readChildrenCard(v: unknown): ChildrenCardView | null {
  if (!isRecord(v)) return null;
  const likelyCount = typeof v.likelyCount === "number" ? v.likelyCount : null;
  const sequence = Array.isArray(v.sequence) ? v.sequence : null;
  if (likelyCount == null || !sequence) return null;
  return {
    likelyCount,
    sequence: sequence.flatMap((raw) => {
      if (!isRecord(raw)) return [];
      const index = typeof raw.index === "number" ? raw.index : null;
      if (index == null) return [];
      return [
        {
          index,
          tendency: readTendency(raw.tendency),
          confidence: readConfidence(raw.confidence),
          obstructionScore: typeof raw.obstructionScore === "number" ? raw.obstructionScore : 0,
        },
      ];
    }),
  };
}

export function buildProgenyView(scores: Record<string, unknown>): ProgenyView {
  const convergence =
    typeof scores.coupleConvergence === "string" &&
    CONVERGENCE_BANDS.includes(scores.coupleConvergence)
      ? (scores.coupleConvergence as ConvergenceBand)
      : null;

  return {
    motherPromise: readPromise(scores.motherPromise),
    fatherPromise: readPromise(scores.fatherPromise),
    coupleConvergence: convergence,
    childSequence: readChildSequence(scores.childSequence),
    childrenCard: readChildrenCard(scores.childrenCard),
    spouseName: typeof scores.spouseName === "string" ? scores.spouseName : null,
  };
}

/**
 * Lucide icon NAMES per canonical section id (jyotish-backend's config/report-sections.ts lists
 * progeny's 9). Names, not components, so this file stays React-free.
 */
export const SECTION_ICON: Record<string, string> = {
  progeny_promise: "Sparkles",
  saptamsa_reading: "Grid3x3",
  reproductive_capacity: "Leaf",
  couple_synthesis: "Heart",
  child_sequence: "Baby",
  progeny_timing: "CalendarHeart",
  obstructions: "ShieldAlert",
  progeny_remedies: "Flame",
  progeny_outlook: "Compass",
};
