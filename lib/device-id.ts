const DEVICE_ID_KEY = "aroha:deviceId";

/**
 * Stable per-install id, generated once and persisted. Passed on every
 * device-token registration so the backend can revoke a device's previous
 * (rotated) token instead of accumulating one row per app launch — see
 * revokeOtherTokensForDevice() in device-tokens.repo.ts.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

const PUSH_REFRESHED_KEY = "aroha:pushRefreshedAt:v1";
const PUSH_REFRESH_EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether the silent FCM token refresh is due (at most once a day).
 *
 * PushNotificationListener used to call FirebaseMessaging.getToken() on every
 * single cold start. That is both pointless — the token is almost always the
 * one already registered — and dangerous: the plugin's getToken() completion
 * handler runs on the main thread and does
 *
 *     Exception exception = task.getException();
 *     resultCallback.error(exception.getMessage());   // no null check
 *
 * (@capacitor-firebase/messaging 6.3.1, FirebaseMessaging.java:31-37). A
 * cancelled task has a null exception, so that NPE lands uncaught on the main
 * looper and Android kills the app process — a JS try/catch around the bridge
 * call cannot see it. Every launch was a roll of that dice for every logged-in
 * user, which is what "the app closes when I open it" looks like.
 *
 * Once a day still heals a token the backend revoked as dead within one day,
 * which is what the self-heal was written for, at ~1/20th the exposure.
 */
export function isPushRefreshDue(): boolean {
  if (typeof window === "undefined") return false;
  const elapsed = Date.now() - Number(window.localStorage.getItem(PUSH_REFRESHED_KEY));
  // Fails OPEN on anything unusable: NaN (never stored, or corrupt) and a
  // negative elapsed (a clock that jumped backwards left a future timestamp)
  // both fall through to "due". Being due early costs one extra getToken();
  // failing closed would silently kill push for that install forever.
  return !(elapsed >= 0 && elapsed < PUSH_REFRESH_EVERY_MS);
}

/** Starts the next refresh window. Call after a successful registration. */
export function markPushRefreshed(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PUSH_REFRESHED_KEY, String(Date.now()));
}
