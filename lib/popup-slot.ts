/**
 * "At most one pop-up per app open" (sprint L1). Every auto-opening pop-up asks this before it shows.
 *
 * Priority, highest first: Update, Permissions, Welcome/Tour, Varshik launch, Festival gift, Rate us.
 * A pop-up opens only when no higher-priority one is still deciding, and a pop-up that showed this open keeps the
 * slot until the app is closed, so a lower one waits for a later visit.
 *
 * Strict, as the owner chose: even the first-run ones (an update notice, the permissions ask, the welcome and tour)
 * do not follow one another in one open. Each waits while a higher one is still deciding, and a pop-up that has not
 * been able to open simply tries again on the next visit.
 */

export const POPUP_ORDER = ["update", "permissions", "welcome", "varshik-launch", "festival-gift", "rate-us"] as const;
export type PopupId = (typeof POPUP_ORDER)[number];

export interface SlotState {
  /** The pop-up that showed during this app open, if any. */
  holder: PopupId | null;
  /** Mounted pop-ups that have not yet decided whether they will show. */
  pending: ReadonlySet<PopupId>;
}

export function canOpenPopup(id: PopupId, state: SlotState): boolean {
  if (state.holder && state.holder !== id) return false;
  const rank = POPUP_ORDER.indexOf(id);
  return !POPUP_ORDER.slice(0, rank).some((higher) => state.pending.has(higher));
}
