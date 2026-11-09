/**
 * "At most one pop-up per app open" (sprint L1). Every auto-opening pop-up asks this before it shows.
 *
 * Priority, highest first: Update, Permissions, Welcome/Tour, Varshik launch, Festival gift, Rate us.
 * A pop-up opens only when no higher-priority one is still deciding, and a pop-up that showed this open keeps the
 * slot until the app is closed, so a lower one waits for a later visit.
 *
 * The first three are the first-run sequence (an update notice, the permissions ask, the welcome and tour). They
 * may follow one another in the same open, as they always have, so a new user is not made to wait a visit for the
 * tour; the promotional ones (launch, gift, rating) never open after any of them.
 */

export const POPUP_ORDER = ["update", "permissions", "welcome", "varshik-launch", "festival-gift", "rate-us"] as const;
export type PopupId = (typeof POPUP_ORDER)[number];

const FIRST_RUN: ReadonlySet<PopupId> = new Set<PopupId>(["update", "permissions", "welcome"]);

export interface SlotState {
  /** The pop-up that showed during this app open, if any. */
  holder: PopupId | null;
  /** Mounted pop-ups that have not yet decided whether they will show. */
  pending: ReadonlySet<PopupId>;
}

export function canOpenPopup(id: PopupId, state: SlotState): boolean {
  if (state.holder && state.holder !== id && !(FIRST_RUN.has(id) && FIRST_RUN.has(state.holder))) return false;
  // The first-run pop-ups already wait on each other (the update check, then permissions, then the welcome), so
  // none of them is held back by another that is still deciding; that would make it give up for the visit.
  if (FIRST_RUN.has(id)) return true;
  const rank = POPUP_ORDER.indexOf(id);
  return !POPUP_ORDER.slice(0, rank).some((higher) => state.pending.has(higher));
}
