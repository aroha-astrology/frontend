/** After "Not now" the permissions prompt stays quiet for a week, in the browser and in the Android app. */
export const PERMISSIONS_REASK_MS = 7 * 24 * 60 * 60 * 1000;

/** `askedAt` is the stored time of the last ask (0 when never asked). */
export function permissionsReaskDue(askedAt: number, now: number): boolean {
  return !(now - askedAt < PERMISSIONS_REASK_MS);
}
