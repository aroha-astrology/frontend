"use client";

import { useEffect, useState, Suspense, type ReactNode } from "react";
import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { getAnalyticsConsent } from "@/lib/analytics-consent";

/**
 * Inits PostHog unless the user has explicitly opted out (see
 * lib/analytics-consent.ts). Idempotent — safe to call again after
 * consent changes.
 */
export function initPostHogIfConsented(): void {
  if (typeof window === "undefined") return;
  if (getAnalyticsConsent() !== "granted") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (key && !posthog.__loaded) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      persistence: "localStorage+cookie",
      person_profiles: "identified_only",
      capture_pageview: false,
      // Defaults to mirroring capture_pageview ('if_capture_pageview'), which
      // would silently disable it here since pageviews are captured manually
      // above — explicit true keeps bounce-rate/session-duration accurate.
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: true,
    });
    void registerNativeAppVersion();
  }
}

/**
 * Tags every subsequent event with the native shell's version. No-op on web,
 * where the App plugin isn't implemented. Uses PostHog's standard $app_*
 * names so they land as first-class properties rather than custom ones.
 *
 * Fire-and-forget: the very first pageview of a fresh install can miss these,
 * but register() persists them, so every later event is tagged.
 */
async function registerNativeAppVersion(): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { App } = await import("@capacitor/app");
    const { version, build, name, id } = await App.getInfo();
    posthog.register({
      $app_version: version,
      $app_build: build,
      $app_name: name,
      $app_namespace: id,
    });
  } catch {
    // Analytics metadata is never worth breaking the app over.
  }
}

// Runs once at module-evaluation time (before any component mounts), so it
// can't race with PostHogPageView's effect — React fires child effects
// before parent effects, so init()'ing from PostHogProvider's own useEffect
// would still be too late for the very first pageview. Skips only if the
// user previously opted out.
if (typeof window !== "undefined") {
  initPostHogIfConsented();
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !posthog.__loaded) return;
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    posthog.capture("$pageview", { $current_url: window.location.origin + url }, { send_instantly: true });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(posthog.__loaded ?? false);
    const onChange = () => {
      initPostHogIfConsented();
      setConsented(posthog.__loaded ?? false);
    };
    window.addEventListener("analytics-consent-changed", onChange);
    return () => window.removeEventListener("analytics-consent-changed", onChange);
  }, []);

  return (
    <>
      {consented && (
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
      )}
      {children}
    </>
  );
}
