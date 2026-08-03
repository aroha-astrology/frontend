/**
 * Live USD→INR lookup for the /admin dashboard's LLM cost estimates.
 *
 * Exists because the rate used to be a hardcoded 88 in three files, which had
 * silently drifted ~8% below the real rate and was being PRINTED on the
 * dashboard as though it were fact. Any hardcoded FX rate is wrong shortly
 * after it is written, so the rate is fetched instead and the constant in
 * admin-format.ts is demoted to a fallback for when the fetch fails.
 *
 * Source is the ECB's published reference rates via frankfurter.app — free, no
 * API key, CORS-enabled, and citable, which matters for a number that feeds a
 * cost report. ECB publishes on business days, so `asOf` can legitimately be
 * a day or two old over a weekend; that is shown rather than hidden.
 *
 * Deliberately NOT cached to localStorage: this is one admin page with a
 * handful of loads a day, and a cache would be one more thing that can serve a
 * stale number — the exact failure mode this file exists to remove.
 */

import { USD_TO_INR_RATE } from "./admin-format";

// The canonical host — api.frankfurter.APP 301-redirects here, and bouncing a
// browser fetch through a Cloudflare redirect is a needless way to lose the CORS
// headers. Verified live: returns {"amount":1,"base":"USD","date":"YYYY-MM-DD",
// "rates":{"INR":n}} with `access-control-allow-origin: *`.
const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?from=USD&to=INR";
const FX_TIMEOUT_MS = 4000;

export interface UsdInrRate {
  rate: number;
  /** ECB publication date (YYYY-MM-DD), or null when the fallback constant is in use. */
  asOf: string | null;
  /** True when the live lookup failed and {@link USD_TO_INR_RATE} was substituted. */
  isFallback: boolean;
}

export const FALLBACK_RATE: UsdInrRate = {
  rate: USD_TO_INR_RATE,
  asOf: null,
  isFallback: true,
};

/**
 * Fetches the current USD→INR rate, falling back to the pinned constant on any
 * failure (offline, non-200, timeout, malformed payload).
 *
 * Never throws and never returns a nonsense rate: a cost dashboard that renders
 * "₹NaN" or crashes because a third-party FX endpoint had a bad afternoon is
 * worse than one showing a slightly stale rate clearly labelled as such.
 */
export async function fetchUsdInrRate(timeoutMs: number = FX_TIMEOUT_MS): Promise<UsdInrRate> {
  try {
    const res = await fetch(FRANKFURTER_URL, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return FALLBACK_RATE;
    const json: unknown = await res.json();
    const rate = (json as { rates?: { INR?: unknown } })?.rates?.INR;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return FALLBACK_RATE;
    const date = (json as { date?: unknown })?.date;
    return { rate, asOf: typeof date === "string" ? date : null, isFallback: false };
  } catch {
    return FALLBACK_RATE;
  }
}
