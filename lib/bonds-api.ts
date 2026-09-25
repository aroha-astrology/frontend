import { request, type ProfileRelationship } from "@/lib/api";
import type { WhyFactor } from "@/lib/insights-api";

export type PhaseTone = "active" | "steady" | "mixed" | "testing";

/** Mirrors backend modules/bonds/bonds.service.ts. */
export interface BondCompatibility {
  kind: "guna" | "harmony";
  score: number;
  max: number;
  pct: number;
  label: "excellent" | "good" | "average" | "below_average" | "poor" | "mixed";
  kootas: Array<{ koota: string; score: number; max: number }>;
}

export interface BondSummary {
  profileId: string;
  name: string | null;
  relationship: ProfileRelationship | null;
  ready: boolean;
  compatibility: BondCompatibility | null;
  phase: PhaseTone | null;
}

export interface BondDetail extends BondSummary {
  phaseDetail: { tone: PhaseTone; lords: [string | null, string | null]; why: WhyFactor[] } | null;
  /** Null while the other person's chart isn't ready. */
  detail: {
    upcoming: Array<{ start: string; end: string; tone: "good" | "care"; lords: [string, string]; why: WhyFactor[] }>;
    communication: WhyFactor[];
    dates: Array<{ date: string; kind: "birthday" | "windowGood" | "windowCare" }>;
  } | null;
}

export const bondsApi = {
  list: () => request<{ bonds: BondSummary[] }>("/v1/bonds", { auth: true }),
  get: (profileId: string) => request<BondDetail>(`/v1/bonds/${profileId}`, { auth: true }),
};

/** Tailwind classes for a phase badge. */
export const PHASE_CLASS: Record<PhaseTone, string> = {
  active: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  steady: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  mixed: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  testing: "text-rose-300 bg-rose-500/10 border-rose-500/30",
};
