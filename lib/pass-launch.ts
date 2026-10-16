/**
 * When the "Aroha Pass is here" popup may show (components/pass/PassLaunchModal).
 *
 * Once per user on a device. Someone who was already using Aroha sees it the
 * first time they open the app after the Pass goes on. A new user does not see
 * it on the visit they signed up in: it waits for their second visit.
 *
 * A "visit" is one launch of the app: sessionStorage lives exactly that long
 * (it survives moving between pages and the app being minimized, and is gone
 * after the app or the tab is closed). A device with no stored first visit
 * and a profile older than a day belongs to an existing user.
 */

const SEEN_KEY = "aroha:passLaunch:seen";
const FIRST_VISIT_KEY = "aroha:passLaunch:firstVisit";
const VISIT_KEY = "aroha:visitId";
/** A profile finished within this long ago, on a device we have not seen, is a new user's first visit. */
export const NEW_USER_MS = 24 * 60 * 60 * 1000;

type Store = Pick<Storage, "getItem" | "setItem">;

interface Stores {
  local: Store;
  session: Store;
}

function browserStores(): Stores | null {
  try {
    return { local: window.localStorage, session: window.sessionStorage };
  } catch {
    return null; // storage blocked
  }
}

/** This launch's id, made on first use. */
function visitId(session: Store, now: number): string {
  let id = session.getItem(VISIT_KEY);
  if (!id) {
    id = `${now}-${Math.random().toString(36).slice(2, 10)}`;
    session.setItem(VISIT_KEY, id);
  }
  return id;
}

/**
 * Whether the popup may show now for this user. Records a new user's first
 * visit as a side effect, so the next visit can tell it is the second.
 */
export function shouldShowPassLaunch(
  user: { id: string; profileCompletedAt: string | null },
  now: number = Date.now(),
  stores: Stores | null = browserStores(),
): boolean {
  // Without storage it could never be put away for good, so it never shows.
  if (!stores || !user.profileCompletedAt) return false;
  try {
    if (stores.local.getItem(`${SEEN_KEY}:${user.id}`)) return false;
    const visit = visitId(stores.session, now);
    const firstVisit = stores.local.getItem(`${FIRST_VISIT_KEY}:${user.id}`);
    if (firstVisit) return firstVisit !== visit;

    const isNewUser = now - new Date(user.profileCompletedAt).getTime() < NEW_USER_MS;
    if (!isNewUser) return true;
    stores.local.setItem(`${FIRST_VISIT_KEY}:${user.id}`, visit);
    return false;
  } catch {
    return false;
  }
}

/** The user closed the popup or followed it: never show it to them again on this device. */
export function markPassLaunchSeen(userId: string, stores: Stores | null = browserStores()): void {
  try {
    stores?.local.setItem(`${SEEN_KEY}:${userId}`, "1");
  } catch {
    // storage blocked: it shows again next launch
  }
}
