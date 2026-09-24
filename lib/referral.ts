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

/**
 * Stash a code that arrived some other way than the URL (the Play install
 * referrer — lib/install-referrer.ts). Never overwrites one already pending:
 * an explicit `?ref=` link the user opened wins.
 */
export function storePendingReferralCode(code: string) {
  if (typeof window === "undefined") return;
  try {
    if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
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

const UTM_STORAGE_KEY = "pending_utm_source";

/**
 * Reads `?utm_source=`/`?utm_campaign=` from the current URL and stashes them
 * for onboarding, same lifecycle as the `?ref=` capture above. Combined as
 * "source/campaign" (or just "source" with no campaign) since the backend's
 * `referral_source` column is a single free-text field.
 */
export function capturePendingUtmSource() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source");
    if (!source) return;
    const campaign = params.get("utm_campaign");
    localStorage.setItem(UTM_STORAGE_KEY, campaign ? `${source}/${campaign}` : source);
  } catch {
    /* ignore */
  }
}

/** Same as capturePendingUtmSource but for a value that didn't come from the URL; never overwrites. */
export function storePendingUtmSource(value: string) {
  if (typeof window === "undefined") return;
  try {
    if (!localStorage.getItem(UTM_STORAGE_KEY)) localStorage.setItem(UTM_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function getPendingUtmSource(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(UTM_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingUtmSource() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(UTM_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * The Play Store link a referral share sends. Play hands the `referrer` value
 * back to the app on first launch (Install Referrer API — mobile
 * InstallReferrerPlugin.java, read by lib/install-referrer.ts), so the new
 * user's onboarding arrives with the code already filled in instead of
 * relying on them typing it.
 */
export function referralPlayStoreUrl(code: string): string {
  return `${PLAY_STORE_URL}&referrer=${encodeURIComponent(`utm_source=referral&ref=${code}`)}`;
}

/**
 * Pulls the referral code and attribution out of a raw Play install referrer
 * string (already URL-decoded by Play, e.g. "utm_source=referral&ref=AB12CD").
 * Organic installs come back as "utm_source=google-play&utm_medium=organic" —
 * no link brought those, so they record no source.
 */
export function parseInstallReferrer(referrer: string): { code: string | null; utmSource: string | null } {
  const params = new URLSearchParams(referrer);
  const ref = params.get("ref") ?? params.get("referralCode");
  const code = ref && /^[A-Za-z0-9_-]{3,32}$/.test(ref.trim()) ? ref.trim().toUpperCase() : null;
  const source = params.get("utm_source");
  const organic = params.get("utm_medium") === "organic";
  const campaign = params.get("utm_campaign");
  const utmSource = source && !organic ? (campaign ? `${source}/${campaign}` : source) : null;
  return { code, utmSource };
}

/**
 * `amounts` carries the admin-resolved referral bonuses (see
 * `useReferralAmounts`) — the share text quotes real figures, so it must never
 * fall back to literals baked into the copy. Callers in React should pass
 * `useReferralAmounts()`; the defaults here mirror the backend registry and
 * exist only for a caller with no feature map available.
 *
 * `festivalTitle` — when a gift campaign is currently live
 * (`user.activeClaimableCampaign?.title`), pass it here to pick up the
 * `_festival` i18next context variant of the same key (e.g. "Share the
 * Blessings, Earn ₹500!" instead of the evergreen line). Omit it and the
 * plain key is used — no separate revert step needed once the campaign ends.
 */
export function buildReferralShareText(
  t: TFunction,
  code: string,
  amounts: { referrerBonus: string; refereeBonus: string } = {
    referrerBonus: "₹100",
    refereeBonus: "₹50",
  },
  festivalTitle?: string,
): string {
  return t("referral.shareMessage", {
    code,
    url: referralPlayStoreUrl(code),
    ...amounts,
    context: festivalTitle ? "festival" : undefined,
    festival: festivalTitle,
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
export function buildReferralShareLinks(
  t: TFunction,
  code: string,
  amounts?: { referrerBonus: string; refereeBonus: string },
  festivalTitle?: string,
): ReferralShareLinks {
  const text = buildReferralShareText(t, code, amounts, festivalTitle);
  const link = referralPlayStoreUrl(code);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
    sms: `sms:?body=${encodeURIComponent(text)}`,
    text,
  };
}
