"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type PersonalizedHoroscope, type PersonalizedHoroscopePeriod } from "@/lib/api";
import { nextPollDelay } from "@/lib/poll-backoff";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";
import { currentPeriodKey, periodExpiresAt } from "@/lib/period-expiry";
import { useAuth } from "@/providers/auth-provider";

export type PersonalizedHoroscopeState = "loading" | "generating" | "ready" | "empty" | "error";

const POLL_TIMEOUT_MS = 60_000;

/**
 * Fetches (and polls until ready) the user's personalized horoscope for a
 * given period. Shared by the /horoscope page's PersonalizedCard and the
 * Home page's TodayReading card, so both surfaces poll the same way.
 *
 * Sends the current UI language on every request rather than relying on
 * `user.contentLanguage` (that field is never updated by the in-app language
 * switcher — see the house-insight hook for the same pattern), so AI-generated
 * text actually re-translates when the user switches language mid-session.
 *
 * Hard-cached client-side (see lib/cache.ts): a ready reading is immutable
 * for its `currentPeriodKey(period)` — the backend generates it once per IST
 * period and serves the same row until rollover (see
 * jyotish-backend's horoscope.service.ts) — so once a period's reading is
 * cached, this hook makes ZERO network requests for it until the period
 * rolls over (periodKey changes) or the absolute `exp` timestamp passes,
 * whichever a clock/period anomaly hits first. Only a terminal "ready" is
 * ever cached; "generating"/"failed" are never persisted.
 *
 * `enabled` defaults to `true` — TodayReading (Home) passes
 * `useFeature('home.todayReading').enabled`, the /horoscope page's
 * PersonalizedCard passes `useFeature('nav.horoscope').enabled` instead
 * (different flag — the page itself, not the home card). When disabled, this
 * resets to the same idle-ish shape and skips the fetch/poll effect entirely,
 * matching useGemstone's pattern.
 */
export function usePersonalizedHoroscope(
  period: PersonalizedHoroscopePeriod,
  enabled: boolean = true,
) {
  const { firebaseUser, loading: authLoading, activeProfile, user } = useAuth();
  const { i18n } = useTranslation();
  const [state, setState] = useState<PersonalizedHoroscopeState>("loading");
  const [data, setData] = useState<PersonalizedHoroscope | null>(null);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    if (!enabled) {
      setState("empty");
      setData(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState("loading");
    setData(null);

    // Cache key is scoped by user+profile so it's per-account; `user` may
    // briefly lag `firebaseUser` right after sign-in (session establishment
    // is still in flight) — when that happens we simply skip caching for
    // this render rather than caching under an incomplete/anonymous key.
    const cacheKey = user
      ? buildKey(
          "horoscope",
          user.id,
          activeProfile?.id ?? "primary",
          i18n.language,
          period,
          currentPeriodKey(period),
        )
      : null;

    if (cacheKey) {
      const cached = cacheGet<PersonalizedHoroscope>(cacheKey);
      if (cached) {
        setData(cached);
        setState("ready");
        return; // Cache hit on hard-cached content — zero network, no poll.
      }
    }

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let attempt = 0;

    const poll = () => {
      api
        .horoscope(period, i18n.language)
        .then((res) => {
          if (cancelled) return;
          if (res.status === "ready") {
            setData(res);
            setState("ready");
            if (cacheKey) cacheSet(cacheKey, res, periodExpiresAt(period));
            return;
          }
          if (res.status === "failed") {
            setState("error");
            return;
          }
          // res.status === "generating" — keep polling until ready or timed out.
          setState("generating");
          const delay = nextPollDelay(attempt++);
          if (Date.now() + delay > deadline) {
            setState("empty");
            return;
          }
          timer = setTimeout(poll, delay);
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 404) setState("empty");
          else setState("error");
        });
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, firebaseUser, enabled, period, i18n.language, activeProfile?.id, user?.id]);

  return { state, data };
}
