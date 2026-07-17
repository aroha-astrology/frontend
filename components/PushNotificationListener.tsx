"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Listens for interactions with push notifications (e.g., user taps on a notification).
 * If the notification payload contains a `navigate` field in its data, this will
 * redirect the user to that route within the app.
 */
export default function PushNotificationListener() {
  const router = useRouter();
  const routerRef = useRef(router);

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
      } catch (err) {
        // fail silently if plugins are not available
      }
    })();

    return () => {
      cancelled = true;
      if (listener) listener.remove();
    };
  }, []);

  return null;
}
