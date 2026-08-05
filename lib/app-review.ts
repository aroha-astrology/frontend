import { registerPlugin } from "@capacitor/core";
import { isNativeAndroid } from "./play-billing";

/** Where the Play listing lives — shared with lib/referral.ts's share links.
 * There's no App Store listing yet. */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.aroha.astrology";

/**
 * Local native plugin registered in mobile/android's MainActivity — not an
 * npm package. Only usable when Capacitor.isNativePlatform() is true.
 */
const AppReview = registerPlugin<{ requestReview(): Promise<void> }>("AppReview");

const ASKED_KEY = "aroha:reviewAsked:v1";
// Play's own quota is roughly monthly and undocumented; staying well clear of it
// means the one time the card does show lands on a user who's had months of use.
const COOLDOWN_MS = 120 * 24 * 60 * 60 * 1000;

/**
 * Show Google's in-app review card, at most once per cooldown, on native Android
 * only. Fire-and-forget by design: Google never reports the star count, whether a
 * review was submitted, or even whether the card appeared, so there is nothing
 * meaningful to return and nothing a caller may branch on.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    if (!(await isNativeAndroid())) return;

    const last = Number(window.localStorage.getItem(ASKED_KEY) ?? 0);
    if (Number.isFinite(last) && Date.now() - last < COOLDOWN_MS) return;
    // Stamped before the call, not after: a rejection still burns the attempt,
    // otherwise a device where the flow is permanently unavailable would retry
    // at every single milestone.
    window.localStorage.setItem(ASKED_KEY, String(Date.now()));

    await AppReview.requestReview();
  } catch {
    // Plugin missing (web/iOS build), localStorage blocked, or Play declined the
    // flow — all non-events for the user.
  }
}
