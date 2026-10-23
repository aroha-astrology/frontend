import { ApiError, request } from "@/lib/api";

export type QuestionPack = "small" | "medium" | "large";

/** The three Passes, cheapest first. */
export type PassTier = "silver" | "gold" | "platinum";

/** The Pass-only features; each tier unlocks some of them. */
export type PassFeature =
  | "timeline"
  | "bonds"
  | "decisions"
  | "findMyDate"
  | "birthTime"
  | "relocation"
  | "voiceCall"
  /** The full palm reading: every tier, one per Pass period (the photo scan is free). */
  | "palm";

/**
 * Free voice-call minutes a Pass gives each period, for text that doesn't know
 * the tier: Silver 10, Gold 15, Platinum 20 (backend PASS_TIERS voiceFreeMinutes,
 * 2026-10-17). Where the tier is known, use its `voiceFreeMinutes`.
 */
export const PASS_VOICE_FREE_MINUTES_RANGE = "10–20";

/** Free voice-call minutes every user gets once, Pass or not. Mirrors backend VOICE_TRIAL_MINUTES. */
export const VOICE_TRIAL_MINUTES = 3;

/** What one tier gives. */
export interface PassTierBenefits {
  questionsPerPeriod: number;
  /** Free voice-call minutes per period (Silver 10, Gold 15, Platinum 20). Absent from a server older than 2026-10-17. */
  voiceFreeMinutes?: number;
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

/** One switch the Pass needs, as Admin shows it. Mirrors backend modules/pass/pass-launch.service.ts. */
export interface PassLaunchSwitch {
  key: string;
  label: string;
  enabled: boolean;
  need: "required" | "optional";
}

export interface PassLaunchReadiness {
  ready: boolean;
  switches: PassLaunchSwitch[];
  playConfigured: boolean;
  audience: { users: number; withPush: number; alreadySent: number };
}

export interface PassLaunchSend {
  attempted: number;
  failed: number;
  skipped: number;
}

/** One active Pass holder, as returned by GET /v1/admin/pass-subscribers. */
export interface PassSubscriberRow {
  userId: string;
  displayName: string | null;
  phoneE164: string | null;
  /** price_variant: 'A' = Silver, 'B' = Gold, 'C' = Platinum, null = before tiers. */
  tier: string | null;
  source: "wallet" | "google_play" | string;
  pricePaise: number;
  periodEnd: string;
  autoRenew: boolean;
  startedAt: string;
}

export interface PassSubscribersPage {
  subscribers: PassSubscriberRow[];
  total: number;
  offset: number;
  limit: number;
}

export const passApi = {
  status: () => request<PassStatus>("/v1/pass", { auth: true }),
  confirmPlay: (productId: string, purchaseToken: string) =>
    request<PassStatus>("/v1/pass/google-play", { method: "POST", body: { productId, purchaseToken }, auth: true }),
  /**
   * Question Packs are bought through Google Play, never from the wallet (owner, 2026-10-23).
   * This records the pending order and names the Play product to launch; the purchase is then
   * confirmed through `api.confirmGooglePlayOrder`, the same as a wallet top-up.
   */
  packCheckout: (pack: QuestionPack) =>
    request<{ productId: string; questions: number }>(`/v1/question-packs/${pack}/checkout`, {
      method: "POST",
      auth: true,
    }),
  adminStats: () => request<PassStats>("/v1/admin/pass-stats", { auth: true }),
  adminSubscribers: (offset = 0, limit = 20) =>
    request<PassSubscribersPage>(`/v1/admin/pass-subscribers?offset=${offset}&limit=${limit}`, { auth: true }),
  launchReadiness: () => request<PassLaunchReadiness>("/v1/admin/pass-launch", { auth: true }),
  /** Sends the launch notification to everyone who has not had it; `onlyMe` sends a try-out to the calling admin. */
  sendLaunch: (onlyMe: boolean) =>
    request<PassLaunchSend>("/v1/admin/pass-launch", { method: "POST", body: { onlyMe }, auth: true }),
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
