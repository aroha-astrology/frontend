import { isNativeAndroid } from "./play-billing";

/**
 * versionCode of the newest build published on Play. Bump this on every release
 * — it must match `versionCode` in the mobile repo's android/app/build.gradle.
 * Living here (rather than in the APK) is the whole point: the web app deploys
 * instantly, so already-installed APKs learn about the new build the moment
 * Vercel goes live, with no native change needed.
 */
export const LATEST_PLAY_BUILD = 10;

const SNOOZE_KEY = "aroha:updateSnoozed:v1";
// "Later" hides it for a day, not forever — an outdated app is a problem that
// keeps being true, unlike the one-shot share/review prompts.
const SNOOZE_MS = 24 * 60 * 60 * 1000;

/**
 * Play reports versionCode as a string. Anything unparseable means we can't
 * tell what's installed, and guessing "outdated" would nag that user forever.
 */
export function isOlderBuild(installed: string, latest: number): boolean {
  const n = Number.parseInt(installed, 10);
  return Number.isFinite(n) && n < latest;
}

/**
 * True when the installed Android build is older than what's on Play and the
 * user hasn't snoozed the prompt today. Android-only: there's no App Store
 * listing to send iOS users to.
 */
export async function isUpdateAvailable(): Promise<boolean> {
  try {
    if (!(await isNativeAndroid())) return false;

    const snoozedAt = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (Number.isFinite(snoozedAt) && Date.now() - snoozedAt < SNOOZE_MS) return false;

    const { App } = await import("@capacitor/app");
    const { build } = await App.getInfo();
    return isOlderBuild(build, LATEST_PLAY_BUILD);
  } catch {
    return false; // plain web build, plugin missing, or localStorage blocked.
  }
}

/**
 * First Android build (1.13) with Google Play subscriptions for the Aroha Pass.
 * The app loads the live site, so older installs get the new pages with their
 * old native code and must not be offered what that code can't do.
 */
export const PLAY_SUBSCRIPTIONS_BUILD = 16;

/** The installed Android versionCode, or null on the web / iOS / when it can't be read. */
export async function installedAndroidBuild(): Promise<number | null> {
  try {
    if (!(await isNativeAndroid())) return null;
    const { App } = await import("@capacitor/app");
    const n = Number.parseInt((await App.getInfo()).build, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function snoozeUpdatePrompt(): void {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {
    // localStorage blocked — the prompt reappears next launch, which is fine.
  }
}
