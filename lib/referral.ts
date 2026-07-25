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
