import { request } from "@/lib/api";
import type { WhyFactor } from "@/lib/insights-api";

export type PracticeItemId = "remedy" | "dasha" | "weekday" | "lalKitab";

/** Mirrors backend modules/practice/practice.service.ts. */
export interface PracticeItem {
  id: PracticeItemId;
  kind: "chant" | "action";
  slug?: string;
  japCount?: number;
  reason?: string;
  lalKitab?: { house: number; lines: number[] };
  why: WhyFactor[];
}

export interface PracticeToday {
  date: string;
  items: PracticeItem[];
  done: PracticeItemId[];
  streak: number;
  week: Array<{ date: string; done: number }>;
  monthDays: number;
}

export const practiceApi = {
  today: () => request<PracticeToday>("/v1/practice/today", { auth: true }),
  complete: (itemId: PracticeItemId) =>
    request<PracticeToday>("/v1/practice/complete", { method: "POST", body: { itemId }, auth: true }),
};
