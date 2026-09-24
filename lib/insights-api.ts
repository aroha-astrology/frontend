import { request, type RectifyEvent } from "@/lib/api";

/** The life areas the roadmap features talk about (mirrors backend lib/intelligence/areas.ts). */
export type LifeArea =
  | "overall"
  | "career"
  | "relationships"
  | "money"
  | "health"
  | "education"
  | "family"
  | "business"
  | "relocation";

/** One piece of chart evidence (mirrors backend lib/intelligence/types.ts). */
export interface WhyFactor {
  kind: "dasha" | "transit" | "house" | "lordship" | "nakshatra" | "yoga" | "panchang";
  planet?: string;
  house?: number;
  sign?: string;
  nakshatra?: string;
  level?: "mahadasha" | "antardasha" | "pratyantardasha";
  effect: -1 | 0 | 1;
  textKey: string;
  params?: Record<string, string | number>;
}

export interface BirthTimeConfidence {
  pct: number;
  level: "low" | "medium" | "high";
  basis: "certificate" | "stated_exact" | "stated_approximate" | "part_of_day" | "missing" | "rectified";
}

export interface WhyResponse {
  area: LifeArea;
  asOf: string;
  factors: WhyFactor[];
  calculation: {
    ayanamsa: string | null;
    houseSystem: string | null;
    nodeType: string | null;
    calculationVersion: string | null;
    calculatedAt: string | null;
  };
  birth: { placeName: string | null; timezone: string | null };
  birthTime: BirthTimeConfidence;
}

export type EventMatchStrength = "strong" | "weak" | "none";

export interface BirthTimeCheck {
  id: string;
  statedTime: string;
  suggestedTime: string;
  offsetMinutes: number;
  confidence: "low" | "medium" | "high";
  confidencePct: number;
  eventMatches: Array<RectifyEvent & { strength: EventMatchStrength }>;
  counts: { strong: number; weak: number; none: number };
  canApply: boolean;
  appliedAt: string | null;
  createdAt: string;
  pricePaidPaise: number;
}

export interface BirthTimeStatus {
  time: string | null;
  accuracy: "exact" | "approximate" | "unknown" | null;
  source: string | null;
  confidence: BirthTimeConfidence;
  latest: BirthTimeCheck | null;
  pricePaise: number;
  freeWithPass: boolean;
}

export const insightsApi = {
  why: (area: LifeArea, date?: string) =>
    request<WhyResponse>(`/v1/why?area=${area}${date ? `&date=${date}` : ""}`, { auth: true }),

  birthTime: () => request<BirthTimeStatus>("/v1/birth-time", { auth: true }),

  runBirthTimeCheck: (events: RectifyEvent[]) =>
    request<BirthTimeCheck>("/v1/birth-time/check", { method: "POST", body: { events }, auth: true }),

  applyBirthTimeCheck: (id: string) =>
    request<BirthTimeCheck>(`/v1/birth-time/check/${id}/apply`, { method: "POST", auth: true }),
};
