/**
 * Past Life view-model — turns the untyped `scores` bag into the shapes the bespoke Past Life
 * screen renders.
 *
 * Same three constraints as the other report view-models: no React, no `t()`, no Tailwind class
 * literals (the JIT does not scan `lib/`).
 */

/** The engine's only strength vocabulary (astro-engine/gemstones.ts). */
export type Strength = "weak" | "average" | "strong";

const STRENGTHS: readonly string[] = ["weak", "average", "strong"];

export interface NodePlacement {
  /** "rahu" | "ketu", lowercased to match /planets/<name>.png. */
  node: "rahu" | "ketu";
  house: number | null;
  sign: string | null;
}

export interface PastLifeView {
  rahu: NodePlacement;
  ketu: NodePlacement;
  /**
   * The canonical axis id — the LOWER house number of the Rahu/Ketu pair, matching the
   * backend's own `axisIdForHouse`. Null unless BOTH nodes resolved to a house and they sit
   * a true 7 houses apart: the backend reads each node from the chart rather than assuming
   * the 180-degree opposition, so a chart that disagrees should show no axis rather than a
   * confidently wrong one.
   */
  axisId: number | null;
  /** Deterministic house-axis theme; `{label, description}` only — deliberately NOT the shared
   * `Archetype` shape, which carries 5 scored traits this report never computes. */
  archetype: { label: string; description: string } | null;
  twelfthLordStrength: Strength | null;
  /** Planets sharing a node's house — "karmic amplifiers". Lowercased for the planet assets. */
  conjunctPlanets: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readHouse(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 12 ? v : null;
}

function readText(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** Rahu and Ketu are 7 houses apart on a 12-house wheel; the axis is named by the lower house. */
function axisIdFor(rahuHouse: number | null, ketuHouse: number | null): number | null {
  if (rahuHouse === null || ketuHouse === null) return null;
  const span = Math.abs(rahuHouse - ketuHouse);
  if (span !== 6) return null; // 7 houses apart counting inclusively == a span of 6
  return Math.min(rahuHouse, ketuHouse);
}

export function buildPastLifeView(scores: Record<string, unknown>): PastLifeView {
  const rahuHouse = readHouse(scores.rahuHouse);
  const ketuHouse = readHouse(scores.ketuHouse);
  const archetype = scores.karmicArchetype;
  const strength = scores.twelfthLordStrength;

  return {
    rahu: { node: "rahu", house: rahuHouse, sign: readText(scores.rahuSign) },
    ketu: { node: "ketu", house: ketuHouse, sign: readText(scores.ketuSign) },
    axisId: axisIdFor(rahuHouse, ketuHouse),
    archetype:
      isRecord(archetype) && readText(archetype.label) && readText(archetype.description)
        ? { label: archetype.label as string, description: archetype.description as string }
        : null,
    twelfthLordStrength:
      typeof strength === "string" && STRENGTHS.includes(strength) ? (strength as Strength) : null,
    conjunctPlanets: Array.isArray(scores.conjunctPlanets)
      ? scores.conjunctPlanets
          .filter((p): p is string => typeof p === "string" && p.trim() !== "")
          .map((p) => p.toLowerCase())
      : [],
  };
}

/** 4 sections; `life_so_far` is absent on reports generated before it was added. */
export const SECTION_ICON: Record<string, string> = {
  karmic_pattern: "Sparkles",
  karmic_axis_theme: "Scale",
  unfinished_business_soul_lesson: "Flame",
  life_so_far: "Layers",
};
