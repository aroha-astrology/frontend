import { ApiError, request } from "@/lib/api";

export type QuestionPack = "small" | "medium" | "large";

/** Mirrors backend modules/pass/pass.service.ts. */
export interface PassStatus {
  enabled: boolean;
  offer: {
    variant: "A" | "B" | "C";
    pricePaise: number;
    /** The Pass is a Google Play subscription only — never paid from the wallet. */
    play: { productId: string; basePlanId: string };
  } | null;
  pass: {
    /** "wallet" only on a Pass from before the Pass went Google-Play-only; it never renews. */
    source: "wallet" | "google_play" | string;
    variant: string | null;
    pricePaise: number;
    periodEnd: string;
    autoRenew: boolean;
    questionsLeft: number;
  } | null;
  questionCredits: number;
  packs: Array<{ pack: QuestionPack; questions: number; pricePaise: number }>;
  benefits: { questionsPerPeriod: number; periodDays: number; reportDiscountPct: number };
}

export interface PassStats {
  active: { total: number; bySource: Record<string, number>; byVariant: Record<string, number> };
  walletRevenuePaise30d: number;
  started30d: number;
  endedOrCancelled30d: number;
  packSales30d: { count: number; revenuePaise: number };
}

export const passApi = {
  status: () => request<PassStatus>("/v1/pass", { auth: true }),
  confirmPlay: (productId: string, purchaseToken: string) =>
    request<PassStatus>("/v1/pass/google-play", { method: "POST", body: { productId, purchaseToken }, auth: true }),
  buyPack: (pack: QuestionPack) =>
    request<PassStatus>(`/v1/question-packs/${pack}/buy`, { method: "POST", auth: true }),
  adminStats: () => request<PassStats>("/v1/admin/pass-stats", { auth: true }),
};

/**
 * The server's answer for an Aroha Pass-only feature (Life Timeline, Bonds,
 * Decisions, Find My Date, the birth-time check, Relocation) when the user has
 * no live Pass. Pages show `PassLock` for it.
 */
export function isPassRequired(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403 && err.message === "PASS_REQUIRED";
}

/** Where a Play Pass is managed (cancel, change payment). */
export const PLAY_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions?sku=aroha_pass_monthly&package=com.aroha.astrology";
