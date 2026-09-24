"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { resolveFeature } from "@/hooks/useFeature";

/**
 * FeatureGuard for pages of features that ship dark (the 2026-09 roadmap):
 * a key missing from `/v1/me` counts as OFF. It waits for the session to load
 * before deciding, because until then every key is "missing" and the page
 * would bounce every user, including the ones it's switched on for.
 */
export default function NewFeatureGuard({ featureKey, children }: { featureKey: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const enabled = resolveFeature(user?.features, featureKey, { failClosed: true }).enabled;

  useEffect(() => {
    if (!loading && !enabled) router.replace("/");
  }, [loading, enabled, router]);

  if (loading || !enabled) return null;
  return <>{children}</>;
}
