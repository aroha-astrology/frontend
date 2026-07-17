/**
 * Standalone analytics-consent flag (localStorage-backed), separate from
 * `dataProcessingConsentActive` (which gates astrology-data processing —
 * chat/forecast/matchmaking — a different DPDP purpose). PostHog must not
 * init/identify/capture until this is explicitly "granted".
 */

const STORAGE_KEY = "aroha_analytics_consent";

export type AnalyticsConsent = "granted" | "denied" | "unset";

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return "unset";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "granted" || raw === "denied" ? raw : "unset";
}

export function setAnalyticsConsent(value: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new Event("analytics-consent-changed"));
}
