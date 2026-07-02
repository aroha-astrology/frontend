// Shared types + parsing helpers for moon-sign forecast cards, used by both
// the home-page slider and the full /horoscope page so the two never drift.

export type Timescale = "daily" | "weekly" | "monthly" | "yearly";

export interface KeyTransit {
  planet: string;
  sign: string;
  house: number;
  influence: string;
}

/** Mirrors the backend's daily MoonSignPrediction. */
export interface DailyForecastData {
  period: "daily";
  sign: string;
  date: string;
  transitMoonSign: string;
  transitMoonNakshatra?: string;
  houseFromSign: number;
  favorable: boolean;
  isAshtamaChandra: boolean;
  quality: string;
  score: number;
  hook: string;
  description: string;
  advice: string;
  luckyColor: string;
  luckyNumber: number;
  keyTransits: KeyTransit[];
}

/** Mirrors the backend's PeriodicMoonSignPrediction (weekly/monthly/yearly). */
export interface PeriodicForecastData {
  period: "weekly" | "monthly" | "yearly";
  sign: string;
  periodStart: string;
  periodEnd: string;
  score: number;
  quality: string;
  favorableDays: number;
  totalDaysSampled: number;
  bestDay?: { date: string; score: number };
  worstDay?: { date: string; score: number };
  hook: string;
  description: string;
  advice: string;
  luckyColor: string;
  luckyNumber: number;
  keyTransits: KeyTransit[];
}

export type ForecastData = DailyForecastData | PeriodicForecastData;

export function isDaily(f: ForecastData): f is DailyForecastData {
  return f.period === "daily";
}

export interface SignForecast {
  name: string;
  dates: string;
  symbol: string;
  rating: number;
  text: string;
  raw: ForecastData | null;
}

export function forecastToRating(forecast: unknown): number {
  if (forecast == null) return 3;
  if (typeof forecast === "object" && forecast !== null) {
    const f = forecast as Record<string, unknown>;
    if (typeof f.score === "number") return Math.min(5, Math.max(1, Math.round(f.score)));
    const quality = String(f.quality ?? "").toLowerCase();
    if (quality.includes("good")) return 4;
    if (quality.includes("challenging")) return 2;
    if (quality.includes("avoid")) return 1;
  }
  return 3;
}

export function forecastToText(forecast: unknown): string {
  if (forecast == null) return "Cosmic energies align for you today.";
  if (typeof forecast === "object" && forecast !== null) {
    const f = forecast as Record<string, unknown>;
    if (typeof f.hook === "string") return f.hook;
    if (typeof f.description === "string") return f.description;
    if (typeof f.summary === "string") return f.summary;
  }
  return "The stars hold guidance for you today.";
}

export const PLANET_EMOJI: Record<string, string> = {
  Sun: "☀️", Moon: "🌙", Mars: "♂️", Mercury: "☿️",
  Jupiter: "♃", Venus: "♀️", Saturn: "♄", Rahu: "🐉", Ketu: "🔥",
};

/** Tailwind classes + i18n key per forecast quality — label text lives in i18n/resources.ts under horoscope.quality.*. */
export const QUALITY_BADGE_KEYS: Record<string, { bg: string; text: string; i18nKey: string }> = {
  good: { bg: "bg-emerald-500/20", text: "text-emerald-400", i18nKey: "horoscope.quality.favorable" },
  challenging: { bg: "bg-amber-500/20", text: "text-amber-400", i18nKey: "horoscope.quality.challenging" },
  avoid: { bg: "bg-red-500/20", text: "text-red-400", i18nKey: "horoscope.quality.unfavorable" },
  moderate: { bg: "bg-blue-500/20", text: "text-blue-400", i18nKey: "horoscope.quality.moderate" },
};
