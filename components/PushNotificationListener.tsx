"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { getDeviceId, isPushRefreshDue, markPushRefreshed } from "@/lib/device-id";

/**
 * Listens for interactions with push notifications (e.g., user taps on a notification).
 * If the notification payload contains a `navigate` field in its data, this will
 * redirect the user to that route within the app.
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
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform()) return;

        const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

        listener = await FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
          const data = event.notification.data as Record<string, string> | undefined;
          if (data && data.navigate) {
            routerRef.current.push(data.navigate);
          }
        });

        if (userId && isPushRefreshDue()) {
          try {
            const perm = await FirebaseMessaging.checkPermissions();
            if (perm.receive === "granted") {
              const { token } = await FirebaseMessaging.getToken();
              const platform = Capacitor.getPlatform();
              if (token && (platform === "android" || platform === "ios")) {
                await api.registerDeviceToken({ token, platform, deviceId: getDeviceId() });
                markPushRefreshed();
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
    };
  }, [userId]);

  return null;
}
