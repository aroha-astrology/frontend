"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type PersonalizedHoroscope, type PersonalizedHoroscopePeriod } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export type PersonalizedHoroscopeState = "loading" | "generating" | "ready" | "empty" | "error";

const POLL_INTERVAL_MS = 2000;
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
 */
export function usePersonalizedHoroscope(period: PersonalizedHoroscopePeriod) {
  const { firebaseUser, loading: authLoading, activeProfile } = useAuth();
  const { i18n } = useTranslation();
  const [state, setState] = useState<PersonalizedHoroscopeState>("loading");
  const [data, setData] = useState<PersonalizedHoroscope | null>(null);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState("loading");
    setData(null);

    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const poll = () => {
      api
        .horoscope(period, i18n.language)
        .then((res) => {
          if (cancelled) return;
          if (res.status === "ready") {
            setData(res);
            setState("ready");
            return;
          }
          if (res.status === "failed") {
            setState("error");
            return;
          }
          // res.status === "generating" — keep polling until ready or timed out.
          setState("generating");
          if (Date.now() + POLL_INTERVAL_MS > deadline) {
            setState("empty");
            return;
          }
          timer = setTimeout(poll, POLL_INTERVAL_MS);
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
  }, [authLoading, firebaseUser, period, i18n.language, activeProfile?.id]);

  return { state, data };
}
