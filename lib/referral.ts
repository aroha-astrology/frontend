import type { TFunction } from "i18next";

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

/** Native share sheet for a user's referral code/link, with a fallback (e.g. clipboard copy)
 * for browsers/dismissals where the share sheet isn't usable. */
export async function shareReferralCode(t: TFunction, code: string, onFallback: () => void) {
  const text = t("referral.shareMessage", {
    code,
    url: `https://app.arohaastrology.in?ref=${code}`,
  });
  if (navigator.share) {
    try {
      await navigator.share({ title: "Aroha Astrology", text });
      return;
    } catch (err) {
      // User dismissed the native share sheet — that's a deliberate "no", not a failure.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }
  onFallback();
}
