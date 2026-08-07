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
