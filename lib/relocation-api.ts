import { request } from "@/lib/api";
import type { WhyFactor } from "@/lib/insights-api";

export const RELOCATION_AREAS = ["career", "relationships", "finance", "education", "family", "lifestyle"] as const;
export type RelocationArea = (typeof RELOCATION_AREAS)[number];
export type AreaLevel = "strong" | "good" | "mixed" | "weak";

/** Same limit as MAX_PLACES in backend modules/relocation/relocation.service.ts. */
export const MAX_PLACES = 5;

/** Mirrors backend modules/relocation/relocation.service.ts. */
export interface RelocationStatus {
  confidence: { pct: number; level: "low" | "medium" | "high" };
  blocked: boolean;
  birthPlace: { name: string | null } | null;
}

export interface AreaScore {
  score: number;
  level: AreaLevel;
  why: WhyFactor[];
}

export interface PlaceResult {
  name: string;
  lat: number;
  lon: number;
  isBirthPlace: boolean;
  ascendantSign: string;
  overall: number;
  areas: Record<RelocationArea, AreaScore>;
}

export interface RelocationPlace {
  name: string;
  lat: number;
  lon: number;
}

export const relocationApi = {
  status: () => request<RelocationStatus>("/v1/relocation", { auth: true }),
  compare: (places: RelocationPlace[]) =>
    request<{ places: PlaceResult[] }>("/v1/relocation/compare", { method: "POST", body: { places }, auth: true }),
};

/** Tailwind classes for a score cell. */
export const LEVEL_CLASS: Record<AreaLevel, string> = {
  strong: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  good: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  mixed: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  weak: "text-rose-300 bg-rose-500/10 border-rose-500/30",
};

/** The level for an overall score, on the same cut-offs as the backend's areas. */
export function levelOf(score: number): AreaLevel {
  if (score >= 70) return "strong";
  if (score >= 55) return "good";
  if (score >= 40) return "mixed";
  return "weak";
}
