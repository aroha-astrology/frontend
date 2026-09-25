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

/* -------------------------------------------------------------------------- */
/* Astro Weather (roadmap step 2)                                              */
/* -------------------------------------------------------------------------- */

export type WeatherAreaKey = "career" | "relationships" | "money" | "energy";

export interface AstroWeather {
  date: string;
  header: { moonSign: string; mahadasha: string | null; antardasha: string | null };
  overall: { score: number; trend: "improving" | "steady" | "declining"; tomorrowScore: number | null };
  areas: Array<{ key: WeatherAreaKey; area: LifeArea; score: number; source: "horoscope" | "chart" }>;
  moments: Array<{ kind: "moonSign" | "moonNakshatra"; at: string; time: string; from: string; to: string }>;
  day: Array<{ start: string; end: string; kind: "good" | "caution"; name: string }>;
  dayAvailable: boolean;
  why: WhyFactor[];
}

export const weatherApi = {
  get: (date?: string) => request<AstroWeather>(`/v1/astro-weather${date ? `?date=${date}` : ""}`, { auth: true }),
};

/* -------------------------------------------------------------------------- */
/* Aroha Calendar (roadmap step 3)                                             */
/* -------------------------------------------------------------------------- */

export type CalendarEventKind =
  | "ingress"
  | "retrograde"
  | "direct"
  | "dashaChange"
  | "areaWindow"
  | "saturnPhase"
  | "eclipse"
  | "festival"
  | "moonSign";

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  date: string;
  exactAt?: string;
  endDate?: string;
  peakDate?: string;
  area?: LifeArea;
  tone: -1 | 0 | 1;
  weight: number;
  params: Record<string, string | number>;
  why: WhyFactor[];
}

export interface CalendarResponse {
  from: string;
  to: string;
  events: CalendarEvent[];
}

export const calendarApi = {
  get: (from?: string, days = 90) =>
    request<CalendarResponse>(`/v1/calendar?days=${days}${from ? `&from=${from}` : ""}`, { auth: true }),
};

/* -------------------------------------------------------------------------- */
/* Life Timeline (roadmap step 4)                                              */
/* -------------------------------------------------------------------------- */

export type TimelineArea = "career" | "relationships" | "money" | "education" | "family" | "business" | "relocation";

export interface TimelineBand {
  start: string;
  end: string;
  score: number;
  level: "high" | "medium";
  lords: [string, string];
  why: WhyFactor[];
}

export interface TimelineResponse {
  birthDate: string;
  today: string;
  /** Birth to age 80. */
  range: { from: string; to: string };
  approximateBirthTime: boolean;
  mahadashas: Array<{ planet: string; start: string; end: string }>;
  lanes: Array<{ area: TimelineArea; bands: TimelineBand[] }>;
}

export const timelineApi = {
  get: () => request<TimelineResponse>("/v1/timeline", { auth: true }),
};
