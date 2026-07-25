"use client";

import type { FeatureState } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

/** Returned for any feature key with no entry in `features` — see the doc comment below. */
export const OPEN_FEATURE_STATE: FeatureState = { enabled: true, pricePaise: null };

/**
 * Pure lookup, split out from the `useFeature` hook below so it's testable
 * with plain vitest (no React/DOM environment needed — see
 * lib/period-expiry.test.ts for the same node-environment convention).
 *
 * Fails OPEN on a missing key — an old cached `/v1/me`/session response, a
 * signed-out user (`features` undefined), or a key this client build doesn't
 * know about yet must never blank out the app. Only an explicit
 * `{ enabled: false }` from the backend hides a nav tab / home card / paid
 * feature, or falls back to a literal price for a paid feature.
 */
export function resolveFeature(
  features: Record<string, FeatureState> | null | undefined,
  key: string,
): FeatureState {
  const state = features?.[key];
  if (!state) return OPEN_FEATURE_STATE;
  return state;
}

/** Reads one admin-controlled feature toggle off the signed-in user. See `resolveFeature` for the fail-open contract. */
export function useFeature(key: string): FeatureState {
  const { user } = useAuth();
  return resolveFeature(user?.features, key);
}
