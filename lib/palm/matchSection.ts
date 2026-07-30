import type { PalmReportSection } from "@/lib/palm-api";

/** Canonical display names for the tappable line/mount keys — used both as the feature
 * sheet's title and to fuzzy-match against Stage B's free-text section headings (the LLM
 * writes natural section titles like "The Heart Line" or "Mount of Jupiter (Guru)", not a
 * fixed key, so this is a best-effort substring match rather than a strict lookup). */
export const LINE_LABELS: Record<string, string> = {
  heartLine: "Heart Line",
  headLine: "Head Line",
  lifeLine: "Life Line",
  fateLine: "Fate Line",
};

export const MOUNT_LABELS: Record<string, string> = {
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

/** Finds the section whose heading best matches the tapped feature's canonical name. Falls
 * back to null (caller shows a generic "see the full reading below" message) rather than
 * guessing wrong — Stage B's headings are free text, not a guaranteed key. */
export function findMatchingSection(
  sections: PalmReportSection[] | undefined,
  canonicalName: string,
): PalmReportSection | null {
  if (!sections) return null;
  const needle = canonicalName.toLowerCase();
  return sections.find((s) => s.heading.toLowerCase().includes(needle)) ?? null;
}
