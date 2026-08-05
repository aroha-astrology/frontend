import type { TFunction } from "i18next";
// The referral share link sends people to the Play Store listing, not the web
// app, so a friend without the app installed lands on "install" rather than a
// browser tab.
import { PLAY_STORE_URL } from "./app-review";

const STORAGE_KEY = "pending_referral_code";

/** Reads `?ref=`/`?referralCode=` from the current URL and stashes it for onboarding. */
export function capturePendingReferralCode() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") ?? params.get("referralCode");
    if (ref) localStorage.setItem(STORAGE_KEY, ref.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

export function getPendingReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingReferralCode() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function buildReferralShareText(t: TFunction, code: string): string {
  return t("referral.shareMessage", {
    code,
    url: PLAY_STORE_URL,
  });
}

export interface ReferralShareLinks {
  whatsapp: string;
  telegram: string;
  sms: string;
  text: string;
}

/** Per-app deep links for the referral message — used by ShareOptionsSheet's app picker.
 * Built explicitly (rather than relying solely on navigator.share) because the Web Share
 * API is unreliable inside the Capacitor Android WebView the shipped app runs in. */
export function buildReferralShareLinks(t: TFunction, code: string): ReferralShareLinks {
  const text = buildReferralShareText(t, code);
  const link = PLAY_STORE_URL;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
    sms: `sms:?body=${encodeURIComponent(text)}`,
    text,
  };
}
