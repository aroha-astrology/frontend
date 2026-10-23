"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { passApi, PASS_PLAY_PRODUCT_ID } from "@/lib/pass-api";
import { refreshPassStatus } from "@/hooks/usePassStatus";
import type { PlayBillingPurchase } from "@/lib/play-billing";

/**
 * On native-Android app start (once per sign-in, not on every re-render),
 * replays confirmation for any Play Billing purchase Google still has
 * recorded as unconsumed — covers the app being killed after Google charges
 * the user but before the confirm call reached the backend. No local
 * persistence needed: confirmGooglePlayOrder looks up the order by
 * (userId, productId), and is idempotent, so replaying an already-granted
 * purchase is always a safe no-op.
 *
 * The same for an Aroha Pass subscription that Play charged but our server never
 * acknowledged (Google refunds it after 3 days otherwise), and then Google Play's
 * own "payment declined" message when a Pass renewal failed (app 1.17+), which
 * re-confirms the Pass at once if the user fixes the payment from it.
 */
export default function GooglePlayPurchaseReconciler() {
  const { user, refresh } = useAuth();
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

        const { PlayBilling } = await import("@/lib/play-billing");
        let grantedAny = false;
        let purchases: PlayBillingPurchase[];
        try {
          ({ purchases } = await PlayBilling.queryUnconsumedPurchases());
        } catch (err) {
          console.error("[GooglePlayPurchaseReconciler] queryUnconsumedPurchases failed", err);
          purchases = [];
        }
        for (const purchase of purchases) {
          if (cancelled) break;
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

        // A Pass bought but never confirmed (the app was killed right after paying).
        let passChanged = false;
        try {
          const { purchases: subs } = await PlayBilling.queryActiveSubscriptions();
          for (const sub of subs) {
            if (cancelled) break;
            if (sub.productId !== PASS_PLAY_PRODUCT_ID || sub.acknowledged !== false) continue;
            if (sub.purchaseState === "pending") continue;
            try {
              await passApi.confirmPlay(sub.productId, sub.purchaseToken);
              passChanged = true;
            } catch (err) {
              console.error("[GooglePlayPurchaseReconciler] Pass confirm failed", err);
            }
          }
        } catch {
          // App older than 1.13 (no subscriptions) — nothing to replay.
        }

        // A Pass renewal whose payment failed: Google's message, with its link to fix it.
        try {
          const { updated, purchaseToken } = await PlayBilling.showPaymentIssueMessage();
          if (updated && purchaseToken && !cancelled) {
            await passApi.confirmPlay(PASS_PLAY_PRODUCT_ID, purchaseToken);
            passChanged = true;
          }
        } catch {
          // App older than 1.17, or nothing to show.
        }

        if (passChanged && !cancelled) refreshPassStatus();
        if ((grantedAny || passChanged) && !cancelled) await refreshRef.current();
      } catch (err) {
        // @capacitor/core or the plugin not resolvable (e.g. plain web build) — nothing to reconcile.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
