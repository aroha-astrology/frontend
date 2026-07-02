// Shared types + parsing helpers for moon-sign forecast cards, used by both
// the home-page slider and the full /horoscope page so the two never drift.

export interface KeyTransit {
  planet: string;
  sign: string;
  house: number;
  influence: string;
}

export interface ForecastData {
  sign: string;
  date: string;
  transitMoonSign: string;
  transitMoonNakshatra?: string;
  houseFromSign: number;
  favorable: boolean;
  isAshtamaChandra: boolean;
  quality: string;
  score: number;
  description: string;
  advice: string;
  luckyColor: string;
  luckyNumber: number;
  keyTransits: KeyTransit[];
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
    if (typeof f.description === "string") return f.description;
    if (typeof f.summary === "string") return f.summary;
  }
  return "The stars hold guidance for you today.";
}

export const PLANET_EMOJI: Record<string, string> = {
  Sun: "☀️", Moon: "🌙", Mars: "♂️", Mercury: "☿️",
  Jupiter: "♃", Venus: "♀️", Saturn: "♄", Rahu: "🐉", Ketu: "🔥",
};

export const QUALITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  good: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Favorable" },
  challenging: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Challenging" },
  avoid: { bg: "bg-red-500/20", text: "text-red-400", label: "Unfavorable" },
  moderate: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Moderate" },
};
