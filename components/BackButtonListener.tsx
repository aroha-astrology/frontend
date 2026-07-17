"use client";

import { useEffect, useRef } from "react";
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

  // Use refs to avoid re-registering the native listener on every navigation
  const pathnameRef = useRef(pathname);
  const handleBackRef = useRef(handleBack);
  const routerRef = useRef(router);

  useEffect(() => {
    pathnameRef.current = pathname;
    handleBackRef.current = handleBack;
    routerRef.current = router;
  }, [pathname, handleBack, router]);

  useEffect(() => {
    let listener: any;
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");
        listener = await App.addListener("backButton", () => {
          if (handleBackRef.current()) return;
          const currentPath = pathnameRef.current;
          if (currentPath && currentPath !== "/") {
            routerRef.current.back();
            return;
          }
          App.exitApp();
        });
      } catch {
        // @capacitor/app not resolvable (e.g. plain web build) — nothing to bridge.
      }
    })();

    return () => {
      cancelled = true;
      if (listener) listener.remove();
    };
  }, []);

  return null;
}
