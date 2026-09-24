import { request, type PlaceOfBirth } from "@/lib/api";
import type { WhyFactor } from "@/lib/insights-api";

/** Mirrors backend lib/astro-tools/muhurta-rules.ts. */
export const DECISION_CATEGORIES = [
  "careerChange",
  "property",
  "marriage",
  "businessLaunch",
  "relocation",
  "education",
] as const;
export type DecisionCategory = (typeof DECISION_CATEGORIES)[number];

export const MUHURTA_CATEGORIES = [
  "house",
  "vehicle",
  "marriage",
  "businessLaunch",
  "agreement",
  "travel",
  "productLaunch",
  "puja",
] as const;
export type MuhurtaCategory = (typeof MUHURTA_CATEGORIES)[number];

export type DecisionKind = "decision" | "muhurta";
export type DayTone = "good" | "neutral" | "caution";
export type AvoidFlag = "eclipse" | "mercuryRetro" | "kharmas" | "combust";

export interface DecisionResult {
  id: string;
  kind: DecisionKind;
  category: string;
  question: string | null;
  place: { name: string | null; lat: number; lon: number; tz: string };
  from: string;
  to: string;
  personal: boolean;
  approximateBirthTime: boolean;
  days: Array<{ date: string; score: number; tone: DayTone; avoid: AvoidFlag[] }>;
  windows: Array<{ start: string; end: string; tone: "good" | "caution"; score: number }>;
  best: Array<{
    date: string;
    score: number;
    why: WhyFactor[];
    time: { start: string; end: string; name: string } | null;
    rahuKaal: { start: string; end: string } | null;
  }>;
  caution: Array<{ date: string; score: number; why: WhyFactor[] }>;
  pricePaidPaise: number;
  createdAt: string;
}

export interface DecisionListItem {
  id: string;
  kind: DecisionKind;
  category: string;
  question: string | null;
  placeName: string | null;
  from: string;
  to: string;
  topDate: string | null;
  createdAt: string;
}

export interface DecisionList {
  items: DecisionListItem[];
  prices: { decision: number; muhurta: number };
  pass: boolean;
}

export const RANGE_OPTIONS = [30, 60, 90] as const;

export const decisionsApi = {
  list: (kind?: DecisionKind) =>
    request<DecisionList>(`/v1/decisions${kind ? `?kind=${kind}` : ""}`, { auth: true }),
  get: (id: string) => request<DecisionResult>(`/v1/decisions/${id}`, { auth: true }),
  decide: (body: { category: DecisionCategory; question?: string; from: string; days: number }) =>
    request<DecisionResult>("/v1/decisions", { method: "POST", body, auth: true }),
  findDate: (body: { category: MuhurtaCategory; place: PlaceOfBirth; from: string; days: number }) =>
    request<DecisionResult>("/v1/find-date", { method: "POST", body, auth: true }),
};
