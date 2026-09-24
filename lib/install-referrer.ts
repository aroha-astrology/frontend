import { registerPlugin } from "@capacitor/core";
import { parseInstallReferrer, storePendingReferralCode, storePendingUtmSource } from "./referral";

/**
 * Local native plugin (mobile/android InstallReferrerPlugin.java) — the
 * `referrer=` Play attached to this install. Only in Android builds from 1.12
 * on; older installs don't have it and this is a silent no-op there.
 */
const InstallReferrer = registerPlugin<{ getReferrer(): Promise<{ referrer: string | null }> }>("InstallReferrer");

const READ_KEY = "aroha:installReferrerRead:v1";

/**
 * On the first launch of a Play install, turns the referral link the user
 * installed from (lib/referral.ts referralPlayStoreUrl) into the same pending
 * code/UTM that a `?ref=` web link produces — onboarding then pre-fills it.
 * Reads once per install (Play keeps the value ~90 days; re-reading adds
 * nothing). Never throws.
 */
export async function captureInstallReferrer(): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.getPlatform() !== "android" || !Capacitor.isPluginAvailable("InstallReferrer")) return;
    if (window.localStorage.getItem(READ_KEY)) return;
    const { referrer } = await InstallReferrer.getReferrer();
    window.localStorage.setItem(READ_KEY, "1");
    if (!referrer) return;
    const { code, utmSource } = parseInstallReferrer(referrer);
    if (code) storePendingReferralCode(code);
    if (utmSource) storePendingUtmSource(utmSource);
  } catch {
    // Plugin missing/erroring — the user can still type a code in onboarding.
  }
}
