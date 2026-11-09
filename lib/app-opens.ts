/** How many times the user has opened the app (one count per launch), and when Rate us is due. */

export const APP_OPENS_KEY = "aroha:appOpens";
/** Rate us asks once, from the 3rd open. */
export const RATE_US_AFTER_OPENS = 3;

type Store = Pick<Storage, "getItem" | "setItem">;

function browserStore(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Counts this open and returns the new total; 0 when storage is blocked, so nothing is asked. */
export function recordAppOpen(store: Store | null = browserStore()): number {
  try {
    if (!store) return 0;
    const n = Number(store.getItem(APP_OPENS_KEY) ?? 0) + 1;
    store.setItem(APP_OPENS_KEY, String(n));
    return n;
  } catch {
    return 0;
  }
}

let counted: number | null = null;
/** This launch's count, taken once however many components ask. */
export function appOpensThisLaunch(): number {
  if (counted === null) counted = recordAppOpen();
  return counted;
}

export function rateUsDue(a: { opens: number; seen: boolean; feedbackGiven: boolean; onReport: boolean }): boolean {
  return !a.seen && !a.feedbackGiven && !a.onReport && a.opens >= RATE_US_AFTER_OPENS;
}
