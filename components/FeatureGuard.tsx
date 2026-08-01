"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFeature } from "@/hooks/useFeature";

/**
 * Route-level gate for a page that corresponds to exactly one `nav.*`
 * feature flag — redirects to "/" when an admin has disabled that flag, so a
 * disabled tab's URL can't be reached by typing it directly or via a stale
 * bookmark/deep link. Mirrors AuthGuard.tsx's redirect-in-progress
 * convention: render nothing while the redirect effect is in flight rather
 * than flashing the real page content first.
 *
 * Only wrap the pages that map 1:1 onto a `nav.*` key with an OFF switch —
 * /vastu, /horoscope, /panchang, /ai-chat, /reports. Do NOT wrap home,
 * /kundli, /profile, /settings, etc. — those aren't behind a `nav.*` toggle.
 * /vastu keeps its guard even though it left the bottom tab bar (see
 * lib/nav-items.ts) — it's reached via a Home card now, but still needs its
 * own kill switch.
 */
export default function FeatureGuard({
  featureKey,
  children,
}: {
  featureKey: string;
  children: React.ReactNode;
}) {
  const { enabled } = useFeature(featureKey);
  const router = useRouter();

  useEffect(() => {
    if (!enabled) router.replace("/");
  }, [enabled, router]);

  if (!enabled) return null;

  return <>{children}</>;
}
