import { ApiError, request } from "@/lib/api";

export type QuestionPack = "small" | "medium" | "large";

/** The three Passes, cheapest first. */
export type PassTier = "silver" | "gold" | "platinum";

/** The Pass-only features; each tier unlocks some of them. */
export type PassFeature = "timeline" | "bonds" | "decisions" | "findMyDate" | "birthTime" | "relocation";

/** What one tier gives. */
export interface PassTierBenefits {
  questionsPerPeriod: number;
  reportDiscountPct: number;
  features: PassFeature[];
}

export interface PassOffer extends PassTierBenefits {
  tier: PassTier;
  variant: "A" | "B" | "C";
  pricePaise: number;
  /** The Pass is a Google Play subscription only — never paid from the wallet. */
  play: { productId: string; basePlanId: string };
}

/** Mirrors backend modules/pass/pass.service.ts. */
export interface PassStatus {
  enabled: boolean;
  /** Every tier that is switched on, cheapest first. */
  offers: PassOffer[];
  pass:
    | ({
        /** Null on a Pass from before the tiers. */
        tier: PassTier | null;
        /**
         * "wallet" only on a Pass from before the Pass went Google-Play-only; it never renews.
         * "group" is the free Pass of an admin user group: no end date the user needs to act on.
         */
        source: "wallet" | "google_play" | "group" | string;
        variant: string | null;
        pricePaise: number;
        periodEnd: string;
        autoRenew: boolean;
        questionsLeft: number;
      } & PassTierBenefits)
    | null;
  questionCredits: number;
  packs: Array<{ pack: QuestionPack; questions: number; pricePaise: number }>;
  periodDays: number;
}

/** The cheapest tier on offer that unlocks `feature`, if any. */
export function offerFor(status: PassStatus, feature: PassFeature): PassOffer | null {
  return status.offers.find((o) => o.features.includes(feature)) ?? null;
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
 * no live Pass, or one whose tier doesn't include it. Pages show `PassLock` for it.
 */
export function isPassRequired(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403 && err.message === "PASS_REQUIRED";
}

/** Where a Play Pass is managed (cancel, change payment). */
export const PLAY_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions?sku=aroha_pass_monthly&package=com.aroha.astrology";
