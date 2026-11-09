/**
 * When a one-time launch pop-up may show (today: the Varshik Rashifal 2027 one, components/reports/ReportLaunchModal).
 *
 * Once per user, ever. The server remembers it (`user.popupsSeen`, so a reinstall or a new phone does not repeat it);
 * a local key covers the gap before /v1/me refreshes. Someone who was already using Aroha sees it the first time they
 * open the app after the switches go on. A new user does not see it on the visit they signed up in: it waits for
 * their second visit.
 *
 * A "visit" is one launch of the app: sessionStorage lives exactly that long (it survives moving between pages and
 * the app being minimized, and is gone after the app or the tab is closed). A device with no stored first visit and
 * a profile older than a day belongs to an existing user.
 */

export const VARSHIK_LAUNCH_ID = "varshik-2027";

const VISIT_KEY = "aroha:visitId";
/** A profile finished within this long ago, on a device we have not seen, is a new user's first visit. */
export const NEW_USER_MS = 24 * 60 * 60 * 1000;

type Store = Pick<Storage, "getItem" | "setItem">;

export interface Stores {
  local: Store;
  session: Store;
}

const seenKey = (id: string, userId: string) => `aroha:launch:${id}:seen:${userId}`;
const firstVisitKey = (id: string, userId: string) => `aroha:launch:${id}:firstVisit:${userId}`;

export function browserStores(): Stores | null {
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
 * Whether the pop-up `id` may show now for this user. Records a new user's first visit as a side effect, so the
 * next visit can tell it is the second.
 */
function shouldShowLaunch(
  id: string,
  user: { id: string; profileCompletedAt: string | null; popupsSeen?: readonly string[] },
  now: number,
  stores: Stores | null,
): boolean {
  // Without storage it could never be put away for good, so it never shows.
  if (!stores || !user.profileCompletedAt) return false;
  if (user.popupsSeen?.includes(id)) return false;
  try {
    if (stores.local.getItem(seenKey(id, user.id))) return false;
    const visit = visitId(stores.session, now);
    const firstVisit = stores.local.getItem(firstVisitKey(id, user.id));
    if (firstVisit) return firstVisit !== visit;

    const isNewUser = now - new Date(user.profileCompletedAt).getTime() < NEW_USER_MS;
    if (!isNewUser) return true;
    stores.local.setItem(firstVisitKey(id, user.id), visit);
    return false;
  } catch {
    return false;
  }
}

/** The Varshik launch pop-up: only while BOTH its own switch and the report's switch are on. */
export function shouldShowVarshikLaunch(args: {
  popupOn: boolean;
  reportOn: boolean;
  user: { id: string; profileCompletedAt: string | null; popupsSeen?: readonly string[] };
  now?: number;
  stores?: Stores | null;
}): boolean {
  if (!args.popupOn || !args.reportOn) return false;
  return shouldShowLaunch(
    VARSHIK_LAUNCH_ID,
    args.user,
    args.now ?? Date.now(),
    args.stores === undefined ? browserStores() : args.stores,
  );
}

/** The user closed the pop-up or followed it: never show it to them again on this device. */
export function markLaunchSeen(id: string, userId: string, stores: Stores | null = browserStores()): void {
  try {
    stores?.local.setItem(seenKey(id, userId), "1");
  } catch {
    // storage blocked: the server's record still stops it
  }
}
