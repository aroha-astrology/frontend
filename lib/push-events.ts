/**
 * Android notification channel all pushes are posted to. Must match the
 * backend's ANDROID_CHANNEL_ID (src/lib/notifications/fcm.ts). Created with
 * HIGH importance so pushes pop up on screen; before this, pushes landed in
 * Android's generic "Miscellaneous" fallback channel and only showed in the
 * shade.
 */
export const ANDROID_PUSH_CHANNEL_ID = "aroha_alerts";

/** A push that arrived while the app was open — Android shows nothing for these on its own. */
export interface ForegroundPush {
  title: string;
  body: string;
  /** In-app route from the push's `data.navigate`, if any. */
  navigate?: string;
  type?: string;
}

const EVENT = "aroha:push-received";

export function emitForegroundPush(push: ForegroundPush): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ForegroundPush>(EVENT, { detail: push }));
}

/** Subscribe to foreground pushes; returns the unsubscribe function. */
export function onForegroundPush(listener: (push: ForegroundPush) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => listener((e as CustomEvent<ForegroundPush>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
