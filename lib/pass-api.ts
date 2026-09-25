import { request } from "@/lib/api";

export type QuestionPack = "small" | "medium" | "large";

/** Mirrors backend modules/pass/pass.service.ts. */
export interface PassStatus {
  enabled: boolean;
  offer: {
    variant: "A" | "B" | "C";
    pricePaise: number;
    play: { productId: string; basePlanId: string } | null;
  } | null;
  pass: {
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
  buyWallet: (autoRenew: boolean) =>
    request<PassStatus>("/v1/pass/wallet", { method: "POST", body: { autoRenew }, auth: true }),
  setAutoRenew: (on: boolean) =>
    request<PassStatus>("/v1/pass/auto-renew", { method: "POST", body: { on }, auth: true }),
  confirmPlay: (productId: string, purchaseToken: string) =>
    request<PassStatus>("/v1/pass/google-play", { method: "POST", body: { productId, purchaseToken }, auth: true }),
  buyPack: (pack: QuestionPack) =>
    request<PassStatus>(`/v1/question-packs/${pack}/buy`, { method: "POST", auth: true }),
  adminStats: () => request<PassStats>("/v1/admin/pass-stats", { auth: true }),
};

/** Where a Play Pass is managed (cancel, change payment). */
export const PLAY_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions?sku=aroha_pass_monthly&package=com.aroha.astrology";
