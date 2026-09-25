import { request, type RectifyDomain } from "@/lib/api";
import type { LifeArea } from "@/lib/insights-api";

export const RATING_FIELDS = ["mood", "energy", "career", "relationship", "money"] as const;
export type RatingField = (typeof RATING_FIELDS)[number];

/** Mirrors backend modules/journal/journal.service.ts. */
export interface JournalEntry {
  date: string;
  mood: number | null;
  energy: number | null;
  career: number | null;
  relationship: number | null;
  money: number | null;
  note: string | null;
  events: RectifyDomain[];
  snapshot: { maha: string | null; antar: string | null; moonSign: string; moonNakshatra: string; tara: number } | null;
}

export type JournalHighlight =
  | { kind: "dashaEvents"; maha: string; antar: string; area: LifeArea; count: number }
  | { kind: "taraMood"; good: number; bad: number };

export interface JournalInsights {
  total: number;
  streak: number;
  averages: Record<RatingField, number | null>;
  eventsByArea: Partial<Record<LifeArea, number>>;
  byDasha: Array<{ maha: string; antar: string; entries: number; events: number; avgMood: number | null }>;
  highlights: JournalHighlight[];
}

export type SaveEntryBody = Partial<Record<RatingField, number | null>> & {
  note?: string | null;
  events?: RectifyDomain[];
};

export const MAX_NOTE_LENGTH = 2000;
export const MAX_EVENTS_PER_DAY = 5;

export const journalApi = {
  list: (range: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    const qs = q.toString();
    return request<{ today: string; entries: JournalEntry[] }>(`/v1/journal${qs ? `?${qs}` : ""}`, { auth: true });
  },
  save: (date: string, body: SaveEntryBody) =>
    request<JournalEntry>(`/v1/journal/${date}`, { method: "PUT", body, auth: true }),
  remove: (date: string) => request<{ deleted: boolean }>(`/v1/journal/${date}`, { method: "DELETE", auth: true }),
  insights: () => request<JournalInsights>("/v1/journal/insights", { auth: true }),
  lifeEvents: () =>
    request<{ events: Array<{ date: string; domain: RectifyDomain }> }>("/v1/journal/life-events", { auth: true }),
};
