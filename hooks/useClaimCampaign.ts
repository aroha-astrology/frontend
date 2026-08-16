"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useFeature } from "./useFeature";
import { api } from "@/lib/api";

/** IST calendar date (YYYY-MM-DD) for "now" — mirrors the backend's istDateString. */
function istToday(): string {
  return istDateOf(new Date());
}

/** IST calendar date (YYYY-MM-DD) for an arbitrary instant — mirrors the backend's istDateString. */
function istDateOf(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export type ClaimCampaignStatus = "offer" | "claiming" | "claimed" | "error";

/**
 * Shared mechanics for a one-time "claim a wallet bonus" campaign modal —
 * Independence Day 2026 today, whatever comes next. Handles every gate
 * (permissions resolved, profile complete, not already claimed, feature
 * enabled, date window, per-device dismiss), the claim API call + balance
 * refresh, and Android back-press dismissal. A new campaign only ever needs a
 * new presentational component passing different config here — see
 * components/IndependenceDayPrompt.tsx and the backend's config/campaigns.ts.
 */
export function useClaimCampaign(opts: {
  /** Must match a key in the backend's CLAIM_CAMPAIGNS (config/campaigns.ts). */
  campaignKey: string;
  /** Feature-registry key resolving the payout amount shown in copy; also this campaign's kill switch. */
  featureKey: string;
  /** Claimable only on this IST calendar date (YYYY-MM-DD) — cosmetic here, the server enforces the real window. */
  istDate: string;
  /** Fail-open fallback paise, shown only if the feature registry has no override yet. */
  fallbackPaise: number;
  /** Per-device "I dismissed this" localStorage key, e.g. "aroha:independenceDay2026:v1". */
  dismissKey: string;
  /** Offer it only while the wallet is strictly under this many paise. Server enforces the real check. */
  maxBalancePaise?: number;
}) {
  const { campaignKey, featureKey, istDate, fallbackPaise, dismissKey, maxBalancePaise } = opts;
  const { user, refresh } = useAuth();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const feature = useFeature(featureKey);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<ClaimCampaignStatus>("offer");
  const [newBalancePaise, setNewBalancePaise] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(dismissKey)) setDismissed(true);
  }, [dismissKey]);

  const alreadyClaimed = user?.claimedCampaigns?.includes(campaignKey) ?? false;
  // A brand-new account already receives the standard signup wallet balance — someone who
  // signed up today would otherwise stack that with the campaign bonus. The server enforces
  // this independently (defense-in-depth for a money endpoint); this just keeps the modal
  // from ever offering a claim it would refuse.
  const signedUpToday = user?.createdAt ? istDateOf(new Date(user.createdAt)) === istDate : false;
  // Balance-gated campaigns only: don't offer a "running low" top-up to a wallet
  // that isn't. Mirrors the server's own ceiling check, which is the real gate.
  const balanceEligible =
    maxBalancePaise === undefined || (user?.walletBalancePaise ?? 0) < maxBalancePaise;

  const visible =
    permissionsResolved &&
    !!user?.profileCompletedAt &&
    !alreadyClaimed &&
    !signedUpToday &&
    balanceEligible &&
    feature.enabled &&
    istToday() === istDate &&
    !dismissed;

  const dismiss = () => {
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // localStorage unavailable — the modal just reappears next open, same as ShareAppPrompt's fallback.
    }
    setDismissed(true);
  };

  useDismissOnBackPress(visible && status !== "claiming", dismiss);

  const claim = async () => {
    setStatus("claiming");
    try {
      const result = await api.claimCampaignBonus(campaignKey);
      await refresh();
      // `claimed: false` means another device won the race — still a success from this
      // screen's POV (the money landed), so it gets the same "claimed" state, not an error.
      setNewBalancePaise(result.walletBalancePaise);
      setStatus("claimed");
    } catch {
      setStatus("error");
    }
  };

  return {
    visible,
    status,
    amountPaise: feature.pricePaise ?? fallbackPaise,
    newBalancePaise,
    dismiss,
    claim,
  };
}
