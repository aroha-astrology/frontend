"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";

/**
 * On every native-Android app start, replays confirmation for any Play
 * Billing purchase Google still has recorded as unconsumed — covers the app
 * being killed after Google charges the user but before the confirm call
 * reached the backend. No local persistence needed: confirmGooglePlayOrder
 * looks up the order by (userId, productId), and is idempotent, so replaying
 * an already-granted purchase is always a safe no-op.
 */
export default function GooglePlayPurchaseReconciler() {
  const { user, refresh: refreshUser } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

        const { PlayBilling } = await import("@/lib/play-billing");
        const { purchases } = await PlayBilling.queryUnconsumedPurchases();
        if (cancelled || purchases.length === 0) return;

        let grantedAny = false;
        for (const purchase of purchases) {
          try {
            await api.confirmGooglePlayOrder({
              purchaseToken: purchase.purchaseToken,
              productId: purchase.productId,
            });
            grantedAny = true;
          } catch (err) {
            console.error("[GooglePlayPurchaseReconciler] confirm failed", err);
          }
        }
        if (grantedAny && !cancelled) await refreshUser();
      } catch (err) {
        // @capacitor/core or the plugin not resolvable (e.g. plain web build) — nothing to reconcile.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, refreshUser]);

  return null;
}
