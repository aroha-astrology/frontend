/**
 * The one-time bubble under the Home avatar that says the ring opens Daily
 * Stories. Once the reader closes it (or opens the stories) it never comes
 * back on this device. Kept in localStorage, like the seen list.
 */
export const HINT_STORAGE_KEY = "aroha:stories:hintClosed:v1";

/** True once the bubble was closed here. Also true with storage blocked: a bubble that can't remember being closed would come back on every visit. */
export function readHintClosed(): boolean {
  try {
    return window.localStorage.getItem(HINT_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

/** Remembers that the bubble was closed. Never throws. */
export function markHintClosed(): void {
  try {
    window.localStorage.setItem(HINT_STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}
