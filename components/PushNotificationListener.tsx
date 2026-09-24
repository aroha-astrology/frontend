"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { getDeviceId, isPushRefreshDue, markPushRefreshed } from "@/lib/device-id";
import { ANDROID_PUSH_CHANNEL_ID, emitForegroundPush } from "@/lib/push-events";
import { track } from "@/lib/analytics";

/**
 * Listens for interactions with push notifications (e.g., user taps on a notification).
 * If the notification payload contains a `navigate` field in its data, this will
 * redirect the user to that route within the app.
 *
 * Pushes that arrive while the app is OPEN are not shown by Android at all —
 * they only reach `notificationReceived`. Those are re-emitted as an in-app
 * event (lib/push-events.ts) for PushForegroundBanner and the Bell dot.
 *
 * Also (re)creates the high-importance Android channel every push is posted to
 * (idempotent) so pushes pop up instead of sitting silently in the shade.
 *
 * Also silently re-registers the device's FCM token, at most once a day, when
 * notification permission is already granted — this is what actually fixes
 * an expired/rotated token (the backend revokes a token once FCM reports it
 * dead; registerDeviceToken() resets that on the next launch with zero user
 * interaction). PermissionsPrompt.tsx only handles the one-time/30-day ASK;
 * this handles the refresh thereafter.
 *
 * The once-a-day throttle is load-bearing, not an optimisation — see
 * isPushRefreshDue() in lib/device-id.ts for the native NPE that running this
 * on every cold start was exposing every logged-in user to.
 */
export default function PushNotificationListener() {
  const router = useRouter();
  const routerRef = useRef(router);
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    let listener: any;
    let receivedListener: any;
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform()) return;

        const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

        listener = await FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
          const data = event.notification.data as Record<string, string> | undefined;
          track("push_opened", { type: data?.type ?? null });
          if (data && data.navigate) {
            routerRef.current.push(data.navigate);
          }
        });

        receivedListener = await FirebaseMessaging.addListener("notificationReceived", (event) => {
          const n = event.notification;
          const data = n.data as Record<string, string> | undefined;
          if (!n.title && !n.body) return;
          track("push_received_foreground", { type: data?.type ?? null });
          emitForegroundPush({ title: n.title ?? "", body: n.body ?? "", navigate: data?.navigate, type: data?.type });
        });

        if (Capacitor.getPlatform() === "android") {
          // importance 4 = IMPORTANCE_HIGH (heads-up); visibility 1 = public.
          FirebaseMessaging.createChannel({
            id: ANDROID_PUSH_CHANNEL_ID,
            name: "Aroha alerts",
            description: "Readings, reports and astrology alerts",
            importance: 4,
            visibility: 1,
          }).catch(() => {});
        }

        if (userId && isPushRefreshDue(userId)) {
          try {
            const perm = await FirebaseMessaging.checkPermissions();
            if (perm.receive === "granted") {
              const { token } = await FirebaseMessaging.getToken();
              const platform = Capacitor.getPlatform();
              if (token && (platform === "android" || platform === "ios")) {
                await api.registerDeviceToken({ token, platform, deviceId: getDeviceId(), pushEnabled: true });
                markPushRefreshed(userId);
              }
            }
          } catch (err) {
            // Best-effort refresh — a failure here shouldn't block the app;
            // the next launch (or the 30-day PermissionsPrompt re-ask) retries.
            console.error("[PushNotificationListener] silent token refresh failed", err);
          }
        }
      } catch (err) {
        // fail silently if plugins are not available
      }
    })();

    return () => {
      cancelled = true;
      if (listener) listener.remove();
      if (receivedListener) receivedListener.remove();
    };
  }, [userId]);

  return null;
}
