"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type { GeolocationStatus } from "@/hooks/useGeolocation";
import { LOCATION_REWARD_REASON } from "@/lib/rewards";

/**
 * Pays the location reward once the OS reports a grant.
 *
 * Shared by the launch prompt and the rewards card, because a user who enables
 * location from the modal must get the same ₹25 as one who does it from the
 * rewards page — otherwise the modal promises money it doesn't deliver.
 *
 * Fire-and-forget by design: the backend dedupes on a ledger reason, so a
 * failure here costs nothing and the next grant retries. `refresh()` only runs
 * on an actual credit, to avoid a pointless /v1/me round trip on every repeat.
 */
export function useLocationRewardClaim(status: GeolocationStatus): void {
  const { user, refresh } = useAuth();
  const alreadyClaimed = user?.claimedCampaigns?.includes(LOCATION_REWARD_REASON) ?? false;

  useEffect(() => {
    if (status !== "granted" || alreadyClaimed) return;
    let cancelled = false;
    api
      .claimLocationReward()
      .then((result) => {
        if (result.claimed && !cancelled) void refresh();
      })
      .catch(() => {
        // Best effort — idempotent server-side, retried on the next grant.
      });
    return () => {
      cancelled = true;
    };
  }, [status, alreadyClaimed, refresh]);
}
