"use client";

import { useFeature } from "./useFeature";
import { formatRupees } from "@/lib/format";

/**
 * The three referral money amounts, pre-formatted for interpolation into the
 * `referral.*` / `sharePrompt.*` copy.
 *
 * These used to be written into the translated strings as literals ("You earn
 * ₹100, they earn ₹50…") in all 7 languages. That was fine only while the
 * amounts were themselves hardcoded in the backend — now that an admin can
 * retune them from the Features board, copy quoting a fixed figure would go
 * stale the moment it changed, and promise users an amount the wallet never
 * receives. That is the same shown-≠-actual defect that had house unlocks
 * advertised at ₹25 and billed at ₹50.
 *
 * The fallbacks mirror `FEATURE_REGISTRY`'s defaults in the backend
 * (`referral.referrerBonus` / `referral.refereeBonus` / `referral.earningsCap`)
 * and only apply when the feature map is missing entirely — e.g. a signed-out
 * user or a stale cached `/v1/me`.
 */
export interface ReferralAmounts {
  /** What the person sharing their code earns, e.g. "₹100". */
  referrerBonus: string;
  /** What the person redeeming a code earns, e.g. "₹50". */
  refereeBonus: string;
  /** Lifetime referral earnings ceiling, e.g. "₹2000". */
  cap: string;
  /** i18next's interpolation options require an index signature to accept this object directly as `t(key, values)`. */
  [key: string]: string;
}

export function useReferralAmounts(): ReferralAmounts {
  const referrer = useFeature("referral.referrerBonus").pricePaise ?? 10000;
  const referee = useFeature("referral.refereeBonus").pricePaise ?? 5000;
  const cap = useFeature("referral.earningsCap").pricePaise ?? 200000;

  return {
    referrerBonus: formatRupees(referrer),
    refereeBonus: formatRupees(referee),
    cap: formatRupees(cap),
  };
}
