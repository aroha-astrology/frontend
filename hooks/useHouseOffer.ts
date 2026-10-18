"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { HouseOfferInfo } from "@/lib/house-offer";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

/**
 * The house-unlock offer for the active profile (switch `money.houseOffer`): which houses are free,
 * the single and bundle prices, and what is left. Null while the switch is off, while loading, or if
 * the request fails: the Kundli page then keeps its one-price unlock exactly as before.
 *
 * Asking for the offer is also what makes the free houses (house 1 and the current Mahadasha house)
 * count as unlocked, server-side. So when the answer lists unlocked houses the session does not know
 * yet, the user is refreshed once and the grid shows them open.
 */
export function useHouseOffer(): { offer: HouseOfferInfo | null; reload: () => void } {
  const { user, refresh, activeProfile } = useAuth();
  const { enabled } = useNewFeature("money.houseOffer");
  const [offer, setOffer] = useState<HouseOfferInfo | null>(null);
  const [nonce, setNonce] = useState(0);
  // The unlocked houses the session already knows, read without re-running the load when they change.
  const knownUnlocked = useRef<number[]>([]);
  knownUnlocked.current = user?.unlockedHouses ?? [];

  const userId = user?.id;
  const profileId = activeProfile?.id ?? "primary";

  useEffect(() => {
    if (!enabled || !userId) {
      setOffer(null);
      return;
    }
    let cancelled = false;
    api
      .houseOffer()
      .then((res) => {
        if (cancelled) return;
        setOffer(res);
        const known = new Set(knownUnlocked.current);
        if (res.enabled && res.unlockedHouses.some((h) => !known.has(h))) void refresh();
      })
      .catch(() => {
        if (!cancelled) setOffer(null);
      });
    return () => {
      cancelled = true;
    };
    // `refresh` is stable enough for this: it only runs on a change of who or what is being viewed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId, profileId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { offer: offer?.enabled ? offer : null, reload };
}
