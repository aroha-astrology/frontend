"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useBackHandlerDispatch } from "@/providers/back-handler-provider";

/**
 * Bridges the Android hardware back button to in-app navigation. Native-only
 * (no-op on web/iOS) — registering a Capacitor `backButton` listener replaces
 * the platform default entirely, so without this the WebView has no history
 * of its own and every back press falls straight through to exiting the app.
 *
 * Order of precedence on each press: close the topmost open overlay (drawer,
 * sheet, tour, permission prompt — see `useDismissOnBackPress`) > navigate to
 * the previous in-app route > exit the app (only when already on Home with
 * nothing open, i.e. there's truly nowhere left to go).
 */
export default function BackButtonListener() {
  const router = useRouter();
  const pathname = usePathname();
  const handleBack = useBackHandlerDispatch();

  useEffect(() => {
    let remove: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");
        const listener = await App.addListener("backButton", () => {
          if (handleBack()) return;
          if (pathname && pathname !== "/") {
            router.back();
            return;
          }
          App.exitApp();
        });
        if (cancelled) {
          listener.remove();
        } else {
          remove = () => listener.remove();
        }
      } catch {
        // @capacitor/app not resolvable (e.g. plain web build) — nothing to bridge.
      }
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [handleBack, pathname, router]);

  return null;
}
