"use client";

import type { FeatureState } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

/** Returned for any feature key with no entry in `features` — see the doc comment below. */
export const OPEN_FEATURE_STATE: FeatureState = { enabled: true, pricePaise: null, originalPricePaise: null };

/** Returned for a missing key when the caller asked to fail CLOSED — see `resolveFeature`. */
export const CLOSED_FEATURE_STATE: FeatureState = { enabled: false, pricePaise: null, originalPricePaise: null };

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
 *
 * `failClosed` flips that for NEW features (see `useNewFeature`): a key the
 * backend hasn't sent yet — because this frontend deployed before the backend
 * that registers it — must stay hidden, not appear to everyone.
 */
export function resolveFeature(
  features: Record<string, FeatureState> | null | undefined,
  key: string,
  opts: { failClosed?: boolean } = {},
): FeatureState {
  const state = features?.[key];
  if (!state) return opts.failClosed ? CLOSED_FEATURE_STATE : OPEN_FEATURE_STATE;
  return state;
}

/** Reads one admin-controlled feature toggle off the signed-in user. See `resolveFeature` for the fail-open contract. */
export function useFeature(key: string): FeatureState {
  const { user } = useAuth();
  return resolveFeature(user?.features, key);
}

/**
 * `useFeature` for features that ship dark (the 2026-09 roadmap and anything
 * after it): a key missing from `/v1/me` counts as OFF. Existing features keep
 * the fail-open `useFeature` so an old cached session never blanks them.
 */
export function useNewFeature(key: string): FeatureState {
  const { user } = useAuth();
  return resolveFeature(user?.features, key, { failClosed: true });
}
