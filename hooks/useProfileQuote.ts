"use client";

import { useFeature, useNewFeature } from "@/hooks/useFeature";
import { usePassStatus } from "@/hooks/usePassStatus";
import { profileCreationQuote, type ProfileQuote } from "@/lib/profile-offer";
import { useAuth } from "@/providers/auth-provider";

/** Fail-open fallbacks, the same as the server's: the resolved feature price is authoritative when present. */
const LEGACY_FALLBACK_PAISE = 20000;
const EXTRA_FALLBACK_PAISE = 9900;

export interface ProfileQuoteState {
  quote: ProfileQuote;
  /** What adding a profile takes from the wallet right now, in paise; 0 when it is free. */
  costPaise: number;
  /** Free slots still open (counts only while the offer is on). */
  freeLeft: number;
}

/**
 * What adding a profile costs this user, so the profile switcher and the new-profile screen quote
 * the same price the server will charge (backend createProfile). With the `money.freeProfiles`
 * offer off it is the old price. With it on, the first free slots cost nothing, then a Pass member
 * adds profiles free, and anyone else pays `money.profileExtra`.
 */
export function useProfileQuote(): ProfileQuoteState {
  const { user } = useAuth();
  const offerOn = useNewFeature("money.freeProfiles").enabled;
  const legacyPaise = useFeature("paid.profileCreation").pricePaise ?? LEGACY_FALLBACK_PAISE;
  const extraPaise = useNewFeature("money.profileExtra").pricePaise ?? EXTRA_FALLBACK_PAISE;
  const hasPass = Boolean(usePassStatus()?.pass);
  const freeLeft = offerOn ? (user?.freeProfilesLeft ?? 0) : 0;

  const quote = profileCreationQuote({ offerOn, freeLeft, hasPass, legacyPaise, extraPaise });
  return { quote, costPaise: quote.kind === "paid" ? quote.pricePaise : 0, freeLeft };
}
