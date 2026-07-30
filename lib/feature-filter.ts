/**
 * Pure filter shared by BottomNavigation's NAV_ITEMS and Home's HOME_SECTIONS
 * — "does this item's admin feature flag say to render it at all". Kept as a
 * plain function taking an `isEnabled` callback (rather than calling
 * `useFeature` itself) for two reasons:
 *   1. React hooks can't be called inside `Array.prototype.filter`'s callback
 *      without tripping the rules-of-hooks lint rule, even when the source
 *      array has a fixed length across renders.
 *   2. It keeps this trivially unit-testable with plain vitest (no React/DOM
 *      environment needed — see lib/period-expiry.test.ts for the same
 *      node-environment convention this mirrors).
 *
 * Call sites bind `isEnabled` to `(key) => resolveFeature(user?.features, key).enabled`
 * (see hooks/useFeature.ts).
 */
export function filterByFeature<T extends { featureKey: string }>(
  items: readonly T[],
  isEnabled: (featureKey: string) => boolean,
): T[] {
  return items.filter((item) => isEnabled(item.featureKey));
}
