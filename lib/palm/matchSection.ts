import type { PalmReportSection } from "@/lib/palm-api";

/**
 * i18n keys for the tappable line/mount ids. The ids themselves are the contract shared with
 * the backend (palm-types.ts's PALM_LINE_KEYS and the mount keys) — the same ids Stage B keys
 * its `lineNotes` by, which is what lets a tap be a direct lookup.
 *
 * These used to be hardcoded English labels that were ALSO fuzzy-matched against Stage B's
 * free-text section headings. That match could open the wrong chapter, or silently open
 * nothing; `lineNotes` replaced it. The section fallback below survives only for readings
 * generated before `lineNotes` existed.
 */
export const LINE_LABEL_KEYS: Record<string, string> = {
  heartLine: "palm.line.heartLine",
  headLine: "palm.line.headLine",
  lifeLine: "palm.line.lifeLine",
  fateLine: "palm.line.fateLine",
  sunLine: "palm.line.sunLine",
  healthLine: "palm.line.healthLine",
  girdleOfVenus: "palm.line.girdleOfVenus",
  ringOfSolomon: "palm.line.ringOfSolomon",
  simianLine: "palm.line.simianLine",
};

export const MOUNT_LABEL_KEYS: Record<string, string> = {
  jupiter: "palm.mount.jupiter",
  saturn: "palm.mount.saturn",
  apollo: "palm.mount.apollo",
  mercury: "palm.mount.mercury",
  venus: "palm.mount.venus",
  luna: "palm.mount.luna",
  marsUpper: "palm.mount.marsUpper",
  marsLower: "palm.mount.marsLower",
  rahuPlain: "palm.mount.rahuPlain",
};

/** English names, used ONLY by the legacy section fallback below (Stage B's headings are
 * English free text regardless of the user's display language). */
const CANONICAL_NAMES: Record<string, string> = {
  heartLine: "Heart Line",
  headLine: "Head Line",
  lifeLine: "Life Line",
  fateLine: "Fate Line",
  sunLine: "Sun Line",
  healthLine: "Health Line",
  girdleOfVenus: "Girdle of Venus",
  ringOfSolomon: "Ring of Solomon",
  simianLine: "Simian",
  jupiter: "Jupiter",
  saturn: "Saturn",
  apollo: "Apollo",
  mercury: "Mercury",
  venus: "Venus",
  luna: "Luna",
  marsUpper: "Mars",
  marsLower: "Mars",
  rahuPlain: "Rahu",
};

/**
 * Legacy fallback for readings generated before `lineNotes` existed: find the section whose
 * heading mentions the tapped feature. Best-effort by nature — returns null rather than
 * guessing wrong, and the caller then shows nothing for that tap.
 */
export function findMatchingSection(
  sections: PalmReportSection[] | undefined,
  key: string,
): PalmReportSection | null {
  const needle = CANONICAL_NAMES[key]?.toLowerCase();
  if (!sections || !needle) return null;
  return sections.find((s) => s.heading.toLowerCase().includes(needle)) ?? null;
}
