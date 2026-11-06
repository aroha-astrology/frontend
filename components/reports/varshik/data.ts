import type { ReportReady } from "@/hooks/useReport";
import type { ReportSection } from "@/lib/reports-api";
import type { VarshikFacts } from "./types";

export interface VarshikData {
  facts: VarshikFacts;
  sections: ReportSection[];
  /** Sections by their canonical id (welcome_letter, area_love, month_03 ...). */
  byId: Record<string, ReportSection>;
}

/**
 * Reads a ready report into the facts and the text. Returns null when the facts are not there
 * (an old or broken row), so the screen can say so instead of drawing empty charts.
 */
export function readVarshik(data: ReportReady): VarshikData | null {
  const raw = (data.scores as Record<string, unknown>).varshik as VarshikFacts | undefined;
  if (!raw || !raw.scores || !Array.isArray(raw.scores.months) || raw.scores.months.length !== 12) return null;
  const byId: Record<string, ReportSection> = {};
  for (const s of data.sections) if (s.id) byId[s.id] = s;
  return { facts: raw, sections: data.sections, byId };
}
