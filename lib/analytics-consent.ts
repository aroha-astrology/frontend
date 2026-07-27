/**
 * Standalone analytics-consent flag (localStorage-backed), separate from
 * `dataProcessingConsentActive` (which gates astrology-data processing —
 * chat/forecast/matchmaking — a different DPDP purpose). Analytics is
 * granted by default; only an explicit prior "denied" opts a user out.
 */

const STORAGE_KEY = "aroha_analytics_consent";

export type AnalyticsConsent = "granted" | "denied";

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return "granted";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "denied" ? "denied" : "granted";
}

export function setAnalyticsConsent(value: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new Event("analytics-consent-changed"));
}
